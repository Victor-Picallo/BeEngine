import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReturnNavDirective } from '../../../core/directives/return-nav.directive';
import { SeriesContextService } from '../../../core/series/series-context.service';
import { NewsItem } from '../../../data/sports.data';
import { NewsImageComponent } from '../../../features/news/news-image/news-image.component';

@Component({
  selector: 'app-news-list',
  templateUrl: './news-list.component.html',
  styleUrl: './news-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle, RouterLink, ReturnNavDirective, NewsImageComponent],
})
export class NewsListComponent {
  private readonly seriesCtx = inject(SeriesContextService);

  news    = input.required<NewsItem[]>();
  accent  = input.required<string>();
  /** Máximo de filas (p. ej. home como muestra). */
  limit   = input<number | null>(null);
  compact = input(false);

  /** Lista sin el artículo destacado (índice 0 en home). */
  listItems = computed(() => {
    const items = this.news().slice(1);
    const max = this.limit();
    return max != null && max > 0 ? items.slice(0, max) : items;
  });

  thumbHeight = computed(() => (this.compact() ? 40 : 50));

  newsListLink = computed(() => this.seriesCtx.path('noticias'));

  articleLink(id?: string): (string | number)[] {
    return id ? this.seriesCtx.path('noticias', id) : this.newsListLink();
  }
}
