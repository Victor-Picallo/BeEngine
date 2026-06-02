import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NewsImageComponent } from '../news/news-image/news-image.component';
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
  readonly news = signal<NewsArticle[]>(this.cached?.news ?? []);
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
    this.news.set(data.news);
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
