import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReturnNavDirective } from '../../core/directives/return-nav.directive';
import { catchError, of, switchMap, tap } from 'rxjs';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { BackNavigationService } from '../../core/services/back-navigation.service';
import { isMotoPulseSeries, newsPathForSeries } from '../../core/series/series.config';
import { SeriesContextService } from '../../core/series/series-context.service';
import type { SeriesId } from '../../core/series/series.types';
import { NewsService } from './news.service';
import { NewsImageComponent } from './news-image/news-image.component';
import { isMotoCategory } from '../../core/series/series-moto';
import type { MotoPulseSeriesId } from '../../core/series/series.types';
import { NEWS_PAGE_CATEGORIES, type NewsArticle } from './news.types';

const FORMULA_NEWS_IDS = new Set<string>(['f1', 'f2', 'f3']);

function motoNewsArticlePath(series: MotoPulseSeriesId, articleId: string): (string | number)[] {
  return series === 'motogp'
    ? ['/motogp', 'noticias', articleId]
    : [`/${series}`, 'noticias', articleId];
}

function motoSeriesForArticle(
  articleCat: string | undefined,
  routeSeries: SeriesId,
): MotoPulseSeriesId {
  if (articleCat && isMotoCategory(articleCat)) return articleCat;
  if (isMotoCategory(routeSeries)) return routeSeries;
  return 'motogp';
}

@Component({
  selector: 'app-f1-news-detail-page',
  standalone: true,
  imports: [AppHeaderComponent, AppSidebarComponent, RouterLink, ReturnNavDirective, NewsImageComponent],
  templateUrl: './f1-news-detail.page.html',
  styleUrls: ['../calendar/f1-calendar.page.css', './f1-news.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class F1NewsDetailPageComponent implements OnInit {
  private readonly news = inject(NewsService);
  private readonly route = inject(ActivatedRoute);
  private readonly backNav = inject(BackNavigationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly seriesCtx = inject(SeriesContextService);

  returnUrl = signal<string | null>(null);

  readonly inMotoApp = computed(() => {
    const art = this.article();
    if (art?.cat != null && isMotoCategory(art.cat)) return true;
    return isMotoPulseSeries(this.seriesCtx.id());
  });

  readonly homePath = computed(() => {
    if (this.inMotoApp()) {
      const cat = this.article()?.cat;
      return (cat && isMotoCategory(cat)) ? `/${cat}` : '/motogp';
    }
    return this.seriesCtx.homePath();
  });

  newsListFallback = computed(() => {
    const art = this.article();
    const cat = art?.cat ?? this.seriesCtx.id();
    if (FORMULA_NEWS_IDS.has(cat)) {
      return newsPathForSeries(cat as SeriesId);
    }
    if (cat && isMotoCategory(cat)) {
      return newsPathForSeries(cat);
    }
    return `/noticias?cat=${cat}`;
  });

  backLabel = computed(() =>
    this.backNav.labelFor(this.returnUrl(), this.newsListFallback()),
  );

  loading = signal(true);
  detailRefreshing = signal(false);
  error = signal<string | null>(null);
  article = signal<NewsArticle | null>(null);

  showInitialLoading = computed(() => this.loading() && !this.article());
  related = signal<NewsArticle[]>([]);

  accent = computed(() => {
    const cat = this.article()?.cat ?? 'f1';
    return NEWS_PAGE_CATEGORIES.find(c => c.id === cat)?.accent ?? '#FFD100';
  });

  catLabel = computed(() => {
    const cat = this.article()?.cat ?? 'f1';
    return NEWS_PAGE_CATEGORIES.find(c => c.id === cat)?.label ?? 'Formula 1';
  });

  readonly motoSidebar = computed(() => this.inMotoApp());

  goBack(): void {
    this.backNav.goBack(this.newsListFallback(), this.returnUrl());
  }

  articleLink(id: string): (string | number)[] {
    const cat = this.article()?.cat;
    if (cat && isMotoCategory(cat)) {
      return motoNewsArticlePath(motoSeriesForArticle(cat, this.seriesCtx.id()), id);
    }
    if (cat && FORMULA_NEWS_IDS.has(cat)) {
      return cat === 'f1' ? ['/f1', 'noticias', id] : [`/${cat}`, 'noticias', id];
    }
    return ['/noticias', id];
  }

  newsListLink(): string | (string | number)[] {
    const art = this.article();
    const cat = art?.cat;
    if (cat && FORMULA_NEWS_IDS.has(cat)) {
      return newsPathForSeries(cat as SeriesId);
    }
    if (cat && isMotoCategory(cat)) {
      return newsPathForSeries(cat);
    }
    return ['/noticias'];
  }

  ngOnInit(): void {
    this.returnUrl.set(this.backNav.captureReturnUrl());
    this.route.paramMap
      .pipe(
        switchMap(params => {
          const id = params.get('articleId');
          if (!id) {
            this.error.set('Artículo no encontrado');
            return of(null);
          }
          if (!this.article()) {
            this.loading.set(true);
          } else {
            this.detailRefreshing.set(true);
          }
          this.error.set(null);
          return this.news.getArticle(id).pipe(
            tap((art) => {
              if (!art) return;
              this.loading.set(false);
              this.detailRefreshing.set(false);
              this.error.set(null);
              this.article.set(art);
              this.loadRelated(art);
            }),
            catchError(() => {
              this.error.set('No se pudo cargar el artículo.');
              this.loading.set(false);
              this.detailRefreshing.set(false);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private loadRelated(art: NewsArticle): void {
    this.news
      .getFeed(art.cat, 'Todos', 12)
      .pipe(
        catchError(() =>
          of({
            items: [] as NewsArticle[],
            total: 0,
            category: art.cat,
            tag: 'Todos',
            page: 1,
            pageSize: 12,
            totalPages: 1,
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.related.set(res.items.filter((i) => i.id !== art.id).slice(0, 3));
      });
  }
}
