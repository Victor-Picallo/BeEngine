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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap, tap } from 'rxjs';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { NewsService } from './news.service';
import { NewsImageComponent } from './news-image/news-image.component';
import { NEWS_PAGE_CATEGORIES, NEWS_PAGE_SIZE, type NewsArticle } from './news.types';

@Component({
  selector: 'app-f1-news-page',
  standalone: true,
  imports: [AppHeaderComponent, AppSidebarComponent, RouterLink, NewsImageComponent],
  templateUrl: './f1-news.page.html',
  styleUrls: ['../calendar/f1-calendar.page.css', './f1-news.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class F1NewsPageComponent implements OnInit {
  private readonly news = inject(NewsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = NEWS_PAGE_CATEGORIES;
  readonly pageSize = NEWS_PAGE_SIZE;

  loading = signal(true);
  error = signal<string | null>(null);
  activeCat = signal('f1');
  page = signal(1);
  articles = signal<NewsArticle[]>([]);
  total = signal(0);
  totalPages = signal(1);

  accent = computed(
    () => this.categories.find(c => c.id === this.activeCat())?.accent ?? '#FFD100',
  );

  catLabel = computed(
    () => this.categories.find(c => c.id === this.activeCat())?.label ?? 'Formula 1',
  );

  showPager = computed(() => this.totalPages() > 1);

  /** Página 1: artículo(s) destacados o, si no hay, el primero en ancho completo. */
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
          const cat = params.get('cat') || 'f1';
          if (this.categories.some(c => c.id === cat)) {
            this.activeCat.set(cat);
          }
          const p = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
          this.page.set(p);
        }),
        switchMap(() => {
          this.loading.set(true);
          this.error.set(null);
          const offset = (this.page() - 1) * this.pageSize;
          return this.news.getFeed(this.activeCat(), 'Todos', this.pageSize, offset).pipe(
            catchError(() => {
              this.error.set('No se pudieron cargar las noticias. Inténtalo de nuevo.');
              return of({
                category: this.activeCat(),
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

  goToPage(next: number): void {
    const p = Math.min(Math.max(1, next), this.totalPages());
    if (p === this.page()) return;

    this.router.navigate(['/noticias'], {
      queryParams: {
        cat: this.activeCat(),
        page: p > 1 ? p : null,
      },
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cardDelay(i: number): number {
    return i * 50;
  }
}
