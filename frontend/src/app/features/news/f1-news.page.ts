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
import { catchError, filter, finalize, map, of, startWith, switchMap, tap } from 'rxjs';
import type { SeriesId } from '../../core/series/series.types';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { isFormulaAppRoute } from '../../core/series/formula-route';
import { newsPathForSeries, seriesFromUrl } from '../../core/series/series.config';
import { SeriesContextService } from '../../core/series/series-context.service';
import { NewsService } from './news.service';
import { NewsImageComponent } from './news-image/news-image.component';
import { NEWS_PAGE_CATEGORIES, NEWS_PAGE_SIZE, type NewsArticle } from './news.types';

const FORMULA_NEWS_IDS = new Set<SeriesId>(['f1', 'f2', 'f3']);

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

  readonly inFormulaApp = computed(() => isFormulaAppRoute(this.urlPath()));

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

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        tap(params => {
          const path = this.router.url.split('?')[0];
          const formula = isFormulaAppRoute(path);

          if (!formula) {
            const cat = params.get('cat') || 'f1';
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
          } else {
            this.activeCat.set(this.seriesCtx.id());
          }

          const p = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
          this.page.set(p);
        }),
        filter(() => {
          const path = this.router.url.split('?')[0];
          if (isFormulaAppRoute(path)) return true;
          const cat = this.route.snapshot.queryParamMap.get('cat');
          return !(cat && FORMULA_NEWS_IDS.has(cat as SeriesId));
        }),
        switchMap(() => {
          this.loading.set(true);
          this.error.set(null);
          const offset = (this.page() - 1) * this.pageSize;
          const path = this.router.url.split('?')[0];
          const cat = isFormulaAppRoute(path) ? seriesFromUrl(path) : this.activeCat();
          this.activeCat.set(cat);
          return this.news.getFeed(cat, 'Todos', this.pageSize, offset).pipe(
            catchError(() => {
              this.error.set('No se pudieron cargar las noticias. Inténtalo de nuevo.');
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
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(res => {
        const maxPage = Math.max(
          1,
          res.totalPages ?? (Math.ceil(res.total / this.pageSize) || 1),
        );
        if (this.page() > maxPage) {
          this.goToPage(maxPage);
          return;
        }
        this.articles.set(res.items);
        this.total.set(res.total);
        this.totalPages.set(maxPage);
      });
  }

  articleLink(id: string): (string | number)[] {
    if (this.inFormulaApp()) {
      return this.seriesCtx.path('noticias', id);
    }
    return ['/noticias', id];
  }

  goToPage(next: number): void {
    const p = Math.min(Math.max(1, next), this.totalPages());
    if (p === this.page()) return;

    if (this.inFormulaApp()) {
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
    return i * 50;
  }
}
