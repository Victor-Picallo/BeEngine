import { ChangeDetectionStrategy, Component, computed, OnDestroy, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import {
  CATEGORIES, CategoryData, CountdownTime, F1_DATA, Favorite,
  FLAG_MAP, MOTOGP_DATA,
} from '../../data/sports.data';
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
export class HomeComponent implements OnDestroy {
  readonly categories = CATEGORIES;
  readonly flagMap    = FLAG_MAP;
  readonly sidebarSections = ['Noticias', 'Calendario', 'Resultados', 'Estadísticas', 'Vídeos'];

  activeCat          = signal('f1');
  liveBannerVisible  = signal(true);
  countdown          = signal<CountdownTime>({ d: 0, h: 0, m: 0, s: 0 });

  currentCat = computed(() => this.categories.find(c => c.id === this.activeCat()) ?? this.categories[0]);
  accent     = computed(() => this.currentCat().accent);
  data       = computed((): CategoryData => this.activeCat() === 'motogp' ? MOTOGP_DATA : F1_DATA);

  currentFavorites = computed((): Favorite[] =>
    this.activeCat() === 'motogp'
      ? [{ name: 'Bagnaia', sub: 'Ducati Lenovo' }, { name: 'M. Márquez', sub: 'Gresini Racing' }]
      : [{ name: 'Verstappen', sub: 'Red Bull Racing' }, { name: 'F. Alonso', sub: 'Aston Martin' }]
  );

  maxConstructorPoints = computed(() =>
    Math.max(...this.data().constructors.map(c => c.points))
  );

  private countdownInterval?: ReturnType<typeof setInterval>;

  constructor() { this.startCountdown(); }

  private startCountdown(): void {
    const update = () => {
      const diff = new Date(this.data().nextRace.date).getTime() - Date.now();
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
    clearInterval(this.countdownInterval);
    this.startCountdown();
  }

  ngOnDestroy(): void {
    clearInterval(this.countdownInterval);
  }
}
