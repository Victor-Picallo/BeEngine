import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { ReturnNavDirective } from '../../core/directives/return-nav.directive';
import {
  catchError,
  exhaustMap,
  filter,
  finalize,
  interval,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import type { SeriesId } from '../../core/series/series.types';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { isFormulaAppRoute } from '../../core/series/formula-route';
import {
  isMotoAppRoute,
  isMotoCategory,
  motoSeriesFromUrl,
} from '../../core/series/series-moto';
import { newsPathForSeries, seriesFromUrl } from '../../core/series/series.config';
import type { MotoPulseSeriesId } from '../../core/series/series.types';
import { SeriesContextService } from '../../core/series/series-context.service';
import { NEWS_LIVE_POLL_MS, NewsService } from './news.service';
import type { NewsFeedResponse } from './news.types';
import { NewsImageComponent } from './news-image/news-image.component';
import { NEWS_PAGE_CATEGORIES, NEWS_PAGE_SIZE, type NewsArticle } from './news.types';

const FORMULA_NEWS_IDS = new Set<SeriesId>(['f1', 'f2', 'f3']);

function motoNewsArticlePath(series: MotoPulseSeriesId, articleId: string): (string | number)[] {
  return series === 'motogp'
    ? ['/motogp', 'noticias', articleId]
    : [`/${series}`, 'noticias', articleId];
}

@Component({
  selector: 'app-f1-news-page',
  standalone: true,
  imports: [AppHeaderComponent, AppSidebarComponent, RouterLink, ReturnNavDirective, NewsImageComponent],
  templateUrl: './f1-news.page.html',
  styleUrls: ['../calendar/f1-calendar.page.css', './f1-news.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class F1NewsPageComponent implements OnInit {
  private readonly news = inject(NewsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly seriesCtx = inject(SeriesContextService);

  readonly categories = NEWS_PAGE_CATEGORIES;
  readonly pageSize = NEWS_PAGE_SIZE;

  loading = signal(true);
  /** Cambio de categoría/página: atenuar feed sin ocultarlo. */
  refreshing = signal(false);
  /** DB pintada; esperando RSS en vivo. */
  liveSyncing = signal(false);
  /** IDs que acaban de entrar (animación puntual, sin flash en todo el grid). */
  private readonly newArticleIds = signal<ReadonlySet<string>>(new Set());
  error = signal<string | null>(null);
  activeCat = signal<SeriesId | string>('f1');
  page = signal(1);
  articles = signal<NewsArticle[]>([]);
  total = signal(0);
  totalPages = signal(1);

  private readonly urlPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split('?')[0]),
      startWith(this.router.url.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  readonly inMotoApp = computed(() => isMotoAppRoute(this.urlPath()));

  readonly inFormulaApp = computed(
    () => isFormulaAppRoute(this.urlPath()) && !this.inMotoApp(),
  );

  readonly motoSidebar = computed(() => this.inMotoApp());

  readonly homePath = computed(() => this.seriesCtx.homePath());

  accent = computed(
    () => this.categories.find(c => c.id === this.activeCat())?.accent ?? '#FFD100',
  );

  catLabel = computed(
    () => this.categories.find(c => c.id === this.activeCat())?.label ?? 'Formula 1',
  );

  showPager = computed(() => this.totalPages() > 1);

  hero = computed(() => {
    if (this.page() !== 1) return [];
    const list = this.articles();
    const flagged = list.filter(a => a.featured);
    if (flagged.length) return flagged;
    return list.length ? [list[0]] : [];
  });

  regular = computed(() => {
    if (this.page() !== 1) return this.articles();
    const heroIds = new Set(this.hero().map(a => a.id));
    return this.articles().filter(a => !heroIds.has(a.id));
  });

  pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  rangeLabel = computed(() => {
    const t = this.total();
    if (!t) return '';
    const start = (this.page() - 1) * this.pageSize + 1;
    const end = Math.min(this.page() * this.pageSize, t);
    return `${start}–${end} de ${t}`;
  });

  /** Pantalla de carga completa solo sin datos previos. */
  showInitialLoading = computed(() => this.loading() && this.articles().length === 0);

  ngOnInit(): void {
    interval(NEWS_LIVE_POLL_MS)
      .pipe(
        filter(
          () =>
            typeof document !== 'undefined' &&
            document.visibilityState === 'visible' &&
            !this.showInitialLoading(),
        ),
        exhaustMap(() => {
          const offset = (this.page() - 1) * this.pageSize;
          const cat = String(this.activeCat());
          return this.news.getFeedLive(cat, 'Todos', this.pageSize, offset).pipe(
            catchError(() => of(null)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res) this.applyFeedResponse(res);
      });

    this.route.queryParamMap
      .pipe(
        tap(params => {
          const path = this.router.url.split('?')[0];
          const formula = isFormulaAppRoute(path) && !isMotoAppRoute(path);
          const moto = isMotoAppRoute(path);
          const catParam = params.get('cat');
          const cat = moto
            ? motoSeriesFromUrl(this.router.url)
            : (catParam || 'f1');

          if (moto) {
            const pageQ = params.get('page');
            const series = motoSeriesFromUrl(this.router.url);
            const onSeriesNews = /^\/(motogp|moto2|moto3)\/noticias/.test(path);
            if (!onSeriesNews) {
              void this.router.navigate(
                series === 'motogp' ? ['/motogp', 'noticias'] : [`/${series}`, 'noticias'],
                {
                  replaceUrl: true,
                  queryParams: pageQ ? { page: pageQ } : {},
                },
              );
              return;
            }
            if (catParam && isMotoCategory(catParam) && catParam !== series) {
              void this.router.navigate(
                catParam === 'motogp' ? ['/motogp', 'noticias'] : [`/${catParam}`, 'noticias'],
                {
                  replaceUrl: true,
                  queryParams: pageQ ? { page: pageQ } : {},
                },
              );
              return;
            }
            this.activeCat.set(series);
          } else if (!formula && isMotoCategory(cat)) {
            const pageQ = params.get('page');
            void this.router.navigate(
              cat === 'motogp' ? ['/motogp', 'noticias'] : [`/${cat}`, 'noticias'],
              {
                replaceUrl: true,
                queryParams: pageQ ? { page: pageQ } : {},
              },
            );
            return;
          } else if (!formula) {
            if (FORMULA_NEWS_IDS.has(cat as SeriesId)) {
              const sid = cat as SeriesId;
              const pageQ = params.get('page');
              void this.router.navigate(
                sid === 'f1' ? ['/f1', 'noticias'] : [`/${sid}`, 'noticias'],
                {
                  replaceUrl: true,
                  queryParams: pageQ ? { page: pageQ } : {},
                },
              );
              return;
            }
            if (this.categories.some(c => c.id === cat)) {
              this.activeCat.set(cat);
            }
          } else if (moto) {
            this.activeCat.set(cat);
          } else {
            this.activeCat.set(this.seriesCtx.id());
          }

          const p = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
          this.page.set(p);
        }),
        filter(() => {
          const path = this.router.url.split('?')[0];
          if (isMotoAppRoute(path)) return true;
          if (isFormulaAppRoute(path)) return true;
          const cat = this.route.snapshot.queryParamMap.get('cat');
          return !(cat && FORMULA_NEWS_IDS.has(cat as SeriesId));
        }),
        switchMap(() => {
          const hasFeed = this.articles().length > 0;
          if (hasFeed) {
            this.refreshing.set(true);
          } else {
            this.loading.set(true);
          }
          this.error.set(null);
          const offset = (this.page() - 1) * this.pageSize;
          const path = this.router.url.split('?')[0];
          let cat: string;
          if (isMotoAppRoute(path)) {
            cat = motoSeriesFromUrl(this.router.url);
          } else if (isFormulaAppRoute(path)) {
            cat = seriesFromUrl(path);
          } else {
            cat = String(this.activeCat());
          }
          this.activeCat.set(cat);
          this.liveSyncing.set(false);
          return this.news.getFeed(cat, 'Todos', this.pageSize, offset).pipe(
            tap((res) => this.applyFeedResponse(res)),
            catchError(() => {
              this.error.set('No se pudieron cargar las noticias. Inténtalo de nuevo.');
              this.loading.set(false);
              this.refreshing.set(false);
              this.liveSyncing.set(false);
              return of({
                category: cat,
                tag: 'Todos',
                total: 0,
                page: 1,
                pageSize: this.pageSize,
                totalPages: 1,
                items: [] as NewsArticle[],
              });
            }),
            finalize(() => {
              this.loading.set(false);
              this.refreshing.set(false);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private applyFeedResponse(res: NewsFeedResponse): void {
    const maxPage = Math.max(
      1,
      res.totalPages ?? (Math.ceil(res.total / this.pageSize) || 1),
    );
    if (this.page() > maxPage) {
      this.goToPage(maxPage);
      return;
    }
    const prevIds = new Set(this.articles().map((a) => a.id));
    const fromLive = res.source != null && res.source !== 'db' && res.source !== 'empty';
    if (fromLive) {
      const added = res.items.filter((a) => !prevIds.has(a.id)).map((a) => a.id);
      this.newArticleIds.set(new Set(added));
    } else if (!prevIds.size) {
      this.newArticleIds.set(new Set());
    }
    this.articles.set(res.items);
    this.total.set(res.total);
    this.totalPages.set(maxPage);
    this.error.set(null);
    this.loading.set(false);
    this.refreshing.set(false);
    this.liveSyncing.set(res.source === 'db');
  }

  animateCard(id: string): boolean {
    return this.newArticleIds().has(id);
  }

  articleLink(id: string): (string | number)[] {
    if (this.inMotoApp()) {
      const series = motoSeriesFromUrl(this.router.url);
      return motoNewsArticlePath(series, id);
    }
    if (this.inFormulaApp()) {
      return this.seriesCtx.path('noticias', id);
    }
    return ['/noticias', id];
  }

  goToPage(next: number): void {
    const p = Math.min(Math.max(1, next), this.totalPages());
    if (p === this.page()) return;

    if (this.inMotoApp()) {
      const series = motoSeriesFromUrl(this.router.url);
      void this.router.navigate(
        series === 'motogp' ? ['/motogp', 'noticias'] : [`/${series}`, 'noticias'],
        { queryParams: { page: p > 1 ? p : null } },
      );
    } else if (this.inFormulaApp()) {
      void this.router.navigate(this.seriesCtx.path('noticias'), {
        queryParams: { page: p > 1 ? p : null },
      });
    } else {
      void this.router.navigate(['/noticias'], {
        queryParams: {
          cat: this.activeCat(),
          page: p > 1 ? p : null,
        },
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cardDelay(i: number): number {
    return this.animateCard(this.regular()[i]?.id ?? '') ? i * 50 : 0;
  }
}
