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
import { catchError, of, switchMap } from 'rxjs';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { NewsService } from './news.service';
import { NewsImageComponent } from './news-image/news-image.component';
import { NEWS_PAGE_CATEGORIES, type NewsArticle } from './news.types';

@Component({
  selector: 'app-f1-news-detail-page',
  standalone: true,
  imports: [AppHeaderComponent, AppSidebarComponent, RouterLink, NewsImageComponent],
  templateUrl: './f1-news-detail.page.html',
  styleUrls: ['../calendar/f1-calendar.page.css', './f1-news.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class F1NewsDetailPageComponent implements OnInit {
  private readonly news = inject(NewsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  loading = signal(true);
  error = signal<string | null>(null);
  article = signal<NewsArticle | null>(null);
  related = signal<NewsArticle[]>([]);

  accent = computed(() => {
    const cat = this.article()?.cat ?? 'f1';
    return NEWS_PAGE_CATEGORIES.find(c => c.id === cat)?.accent ?? '#FFD100';
  });

  catLabel = computed(() => {
    const cat = this.article()?.cat ?? 'f1';
    return NEWS_PAGE_CATEGORIES.find(c => c.id === cat)?.label ?? 'Formula 1';
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap(params => {
          const id = params.get('articleId');
          if (!id) {
            this.error.set('Artículo no encontrado');
            return of(null);
          }
          this.loading.set(true);
          this.error.set(null);
          return this.news.getArticle(id).pipe(
            catchError(() => {
              this.error.set('No se pudo cargar el artículo.');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(art => {
        this.loading.set(false);
        if (!art) {
          this.article.set(null);
          return;
        }
        this.article.set(art);
        this.loadRelated(art);
      });
  }

  private loadRelated(art: NewsArticle): void {
    this.news
      .getFeed(art.cat, 'Todos', 12)
      .pipe(
        catchError(() => of({ items: [] as NewsArticle[], total: 0, category: art.cat, tag: 'Todos' })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(res => {
        this.related.set(res.items.filter(i => i.id !== art.id).slice(0, 3));
      });
  }
}
