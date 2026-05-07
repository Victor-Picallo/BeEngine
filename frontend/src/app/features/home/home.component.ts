import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgStyle } from '@angular/common';
import {
  Category,
  CategoryData,
  CountdownTime,
  Favorite,
  FLAG_MAP,
} from '../../data/sports.data';
import { HomeService } from './services/home.service';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { RaceCardComponent } from '../../shared/components/race-card/race-card.component';
import { StandingsTableComponent } from '../../shared/components/standings-table/standings-table.component';
import { NewsListComponent } from '../../shared/components/news-list/news-list.component';
import { RightRailComponent } from '../../shared/components/right-rail/right-rail.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgStyle,
    TopbarComponent,
    SidebarComponent,
    RaceCardComponent,
    StandingsTableComponent,
    NewsListComponent,
    RightRailComponent,
  ],
})
export class HomeComponent implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly destroyRef  = inject(DestroyRef);

  readonly flagMap         = FLAG_MAP;
  readonly sidebarSections = ['Noticias', 'Calendario', 'Resultados', 'Estadísticas', 'Vídeos'];

  categories        = signal<Category[]>([]);
  homeData          = signal<CategoryData | null>(null);
  activeCat         = signal('f1');
  liveBannerVisible = signal(true);
  loading           = signal(true);
  error             = signal<string | null>(null);
  countdown         = signal<CountdownTime>({ d: 0, h: 0, m: 0, s: 0 });

  currentCat = computed(
    () => this.categories().find(c => c.id === this.activeCat()) ?? this.categories()[0],
  );
  accent = computed(() => this.currentCat()?.accent ?? '#FFD100');

  data = computed(() => this.homeData()!);

  currentFavorites = computed((): Favorite[] => {
    const standings = this.homeData()?.standings ?? [];
    return standings.slice(0, 2).map(d => ({ name: d.driver, sub: d.team }));
  });

  maxConstructorPoints = computed(() => {
    const constructors = this.homeData()?.constructors ?? [];
    return constructors.length ? Math.max(...constructors.map(c => c.points)) : 1;
  });

  private countdownInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.homeService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: cats => {
          this.categories.set(cats);
          this.loadHome(this.activeCat());
        },
        error: () => {
          this.error.set('No se pudieron cargar los datos. Revisa que el backend esté arrancado.');
          this.loading.set(false);
        },
      });
  }

  private loadHome(category: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.homeService
      .getHome(category)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.homeData.set(data);
          this.loading.set(false);
          this.restartCountdown();
        },
        error: () => {
          this.error.set('No se pudieron cargar los datos. Revisa que el backend esté arrancado.');
          this.loading.set(false);
        },
      });
  }

  private restartCountdown(): void {
    clearInterval(this.countdownInterval);
    const update = () => {
      const d = this.homeData();
      if (!d) return;
      const diff = new Date(d.nextRace.date).getTime() - Date.now();
      if (diff <= 0) { this.countdown.set({ d: 0, h: 0, m: 0, s: 0 }); return; }
      this.countdown.set({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    this.countdownInterval = setInterval(update, 1000);
  }

  setCat(id: string): void {
    this.activeCat.set(id);
    this.loadHome(id);
  }

  ngOnDestroy(): void {
    clearInterval(this.countdownInterval);
  }
}
