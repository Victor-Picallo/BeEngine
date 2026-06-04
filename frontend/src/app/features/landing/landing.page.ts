import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, exhaustMap, filter, forkJoin, of, timer } from 'rxjs';
import { NewsImageComponent } from '../news/news-image/news-image.component';
import { NEWS_LIVE_POLL_MS, NewsService } from '../news/news.service';
import type { NewsFeedResponse } from '../news/news.types';
import {
  LANDING_ACCOUNT_BULLETS,
  LANDING_ASSIST_BULLETS,
  LANDING_ASSIST_DEMO,
  LANDING_FEATURE_GROUPS,
  LANDING_GUEST_ROUTE,
  LANDING_TICKER,
} from './landing.data';
import type {
  LandingCategoryView,
  LandingPageData,
  LandingShowcaseFavorite,
} from './landing.service';
import {
  buildPlaceholderLandingData,
  LandingService,
  mergeLandingNewsArticles,
  readLandingCache,
} from './landing.service';
import type { NewsArticle } from '../news/news.types';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, NewsImageComponent],
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly landing = inject(LandingService);
  private readonly newsService = inject(NewsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly featureGroups = LANDING_FEATURE_GROUPS;
  readonly tickerItems = LANDING_TICKER;
  readonly accountBullets = LANDING_ACCOUNT_BULLETS;
  readonly assistBullets = LANDING_ASSIST_BULLETS;
  readonly assistDemo = LANDING_ASSIST_DEMO;
  readonly guestRoute = LANDING_GUEST_ROUTE;

  private readonly cached = readLandingCache();

  readonly pendingData = signal(!this.cached);
  readonly categories = signal<LandingCategoryView[]>(this.cached?.categories ?? []);
  readonly favorites = signal<LandingShowcaseFavorite[]>(this.cached?.favorites ?? []);
  private readonly f1News = signal<NewsArticle[]>([]);
  private readonly motogpNews = signal<NewsArticle[]>([]);
  readonly news = computed(() => mergeLandingNewsArticles(this.f1News(), this.motogpNews()));
  readonly heroCircuitUrl = signal<string | null>(this.cached?.heroCircuitUrl ?? null);
  readonly heroNextRaceLabel = signal(this.cached?.heroNextRaceLabel ?? '');

  readonly scrolled = signal(false);
  readonly hoveredCat = signal<string | null>(null);

  private revealObserver?: IntersectionObserver;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.scrolled.set(window.scrollY > 40);
  }

  ngOnInit(): void {
    if (this.cached) {
      this.applyLandingData(this.cached);
    }
    this.fetchLandingData();
    this.refreshLandingNews();
    this.startNewsLivePolling();
  }

  private newestPublishedAt(items: NewsArticle[]): number {
    return items.reduce((max, a) => {
      const t = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      return t > max ? t : max;
    }, 0);
  }

  /** Aplica solo si el lote es más reciente (evita que RSS en caché pise la DB). */
  private applyLandingNewsFeed(slot: 'f1' | 'motogp', res: NewsFeedResponse): void {
    if (!res.items.length) return;

    const current = slot === 'f1' ? this.f1News() : this.motogpNews();
    const incomingTs = this.newestPublishedAt(res.items);
    const currentTs = this.newestPublishedAt(current);

    if (current.length && incomingTs < currentTs) return;

    if (slot === 'f1') this.f1News.set(res.items);
    else this.motogpNews.set(res.items);
  }

  /** getFeed emite DB y luego RSS; hay que suscribirse a cada emisión (forkJoin no sirve). */
  private refreshLandingNews(): void {
    this.subscribeNewsFeed('f1', 4);
    this.subscribeNewsFeed('motogp', 2);
  }

  private subscribeNewsFeed(slot: 'f1' | 'motogp', limit: number): void {
    this.newsService
      .getFeed(slot, 'Todos', limit, 0)
      .pipe(
        catchError(() => of(this.emptyNewsFeed(slot, limit))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.applyLandingNewsFeed(slot, res);
        this.cdr.markForCheck();
        this.scheduleReveal();
      });
  }

  private fetchLiveNews() {
    return forkJoin({
      f1: this.newsService
        .getFeedLive('f1', 'Todos', 4, 0)
        .pipe(catchError(() => of(null))),
      motogp: this.newsService
        .getFeedLive('motogp', 'Todos', 2, 0)
        .pipe(catchError(() => of(null))),
    });
  }

  private startNewsLivePolling(): void {
    timer(NEWS_LIVE_POLL_MS, NEWS_LIVE_POLL_MS)
      .pipe(
        filter(
          () =>
            typeof document !== 'undefined' && document.visibilityState === 'visible',
        ),
        exhaustMap(() => this.fetchLiveNews()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res.f1?.items?.length) this.applyLandingNewsFeed('f1', res.f1);
        if (res.motogp?.items?.length) this.applyLandingNewsFeed('motogp', res.motogp);
        this.cdr.markForCheck();
        this.scheduleReveal();
      });
  }

  private emptyNewsFeed(category: string, pageSize: number): NewsFeedResponse {
    return {
      items: [],
      total: 0,
      category,
      tag: 'Todos',
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  private fetchLandingData(): void {
    this.landing
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.applyLandingData(data);
        },
        error: () => {
          if (!this.categories().length) {
            this.applyLandingData(buildPlaceholderLandingData());
          }
          this.pendingData.set(false);
          this.cdr.markForCheck();
          this.scheduleReveal();
        },
      });
  }

  private applyLandingData(data: LandingPageData): void {
    this.categories.set(data.categories);
    this.favorites.set(data.favorites);
    this.heroCircuitUrl.set(data.heroCircuitUrl);
    this.heroNextRaceLabel.set(data.heroNextRaceLabel);
    this.pendingData.set(false);
    this.cdr.markForCheck();
    this.scheduleReveal();
  }

  ngAfterViewInit(): void {
    this.scheduleReveal();
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
  }

  setHoveredCat(id: string | null): void {
    this.hoveredCat.set(id);
  }

  isCatHovered(id: string): boolean {
    return this.hoveredCat() === id;
  }

  hubIndex(groupIndex: number, itemIndex: number): string {
    const n = groupIndex * 3 + itemIndex + 1;
    return n < 10 ? `0${n}` : String(n);
  }

  newsAccent(cat: string): string {
    const map: Record<string, string> = {
      f1: '#E10600',
      f2: '#0090D4',
      f3: '#E8A200',
      motogp: '#CC0000',
      moto2: '#00853F',
      moto3: '#0066B1',
    };
    return map[cat] ?? '#FFD100';
  }

  private scheduleReveal(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.setupReveal());
    });
  }

  private setupReveal(): void {
    this.revealObserver?.disconnect();
    this.revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
          }
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' },
    );
    const host = document.querySelector('app-landing-page');
    const scope = host ?? document;
    scope.querySelectorAll('.landing-reveal').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('in');
      }
      this.revealObserver?.observe(el);
    });
  }
}
