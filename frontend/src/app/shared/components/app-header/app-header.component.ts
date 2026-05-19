import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { TopbarComponent } from '../topbar/topbar.component';
import { HomeService } from '../../../features/home/services/home.service';
import type { Category } from '../../../data/sports.data';
import { SeriesContextService } from '../../../core/series/series-context.service';
import { FORMULA_SERIES_IDS, homePathForSeries, SERIES_CONFIG } from '../../../core/series/series.config';
import { isFormulaAppRoute } from '../../../core/series/formula-route';
import type { SeriesId } from '../../../core/series/series.types';

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'f1', label: 'Formula 1', short: 'F1', accent: '#FFD100' },
  { id: 'motogp', label: 'MotoGP', short: 'MotoGP', accent: '#FFD100' },
];

const FORMULA_HEADER_CATEGORIES: Category[] = FORMULA_SERIES_IDS.map((id) => {
  const c = SERIES_CONFIG[id];
  return { id: c.id, label: c.label, short: c.short, accent: c.accent };
});

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [TopbarComponent],
  template: `
    <app-topbar
      [categories]="displayCategories()"
      [activeCat]="activeCat()"
      [accent]="accent()"
      (catChange)="onCatChange($event)">
    </app-topbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly seriesCtx = inject(SeriesContextService);

  private readonly globalCategories = signal<Category[]>(FALLBACK_CATEGORIES);
  private readonly newsActiveCat = signal('f1');

  private readonly urlPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split('?')[0]),
      startWith(this.router.url.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  readonly inFormulaApp = computed(() => isFormulaAppRoute(this.urlPath()));

  readonly displayCategories = computed(() =>
    this.inFormulaApp() ? FORMULA_HEADER_CATEGORIES : this.globalCategories(),
  );

  readonly activeCat = computed(() =>
    this.inFormulaApp() ? this.seriesCtx.id() : this.newsActiveCat(),
  );

  readonly accent = computed(() => {
    const cat = this.displayCategories().find((c) => c.id === this.activeCat());
    return cat?.accent ?? this.seriesCtx.config().accent;
  });

  ngOnInit(): void {
    this.homeService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cats) => {
          if (cats?.length) this.globalCategories.set(cats);
        },
        error: () => {},
      });
  }

  onCatChange(id: string): void {
    if (this.inFormulaApp()) {
      const sid = id as SeriesId;
      if (sid === this.seriesCtx.id()) return;
      void this.router.navigateByUrl(homePathForSeries(sid));
      return;
    }

    this.newsActiveCat.set(id);
    const url = this.urlPath();
    if (url.startsWith('/noticias')) {
      void this.router.navigate(['/noticias'], {
        queryParams: { cat: id, page: null },
      });
      return;
    }
    if (id !== 'f1') {
      void this.router.navigate(['/noticias'], { queryParams: { cat: id, page: null } });
    }
  }
}
