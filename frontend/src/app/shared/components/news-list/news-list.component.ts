import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NewsItem } from '../../../data/sports.data';
import { NewsImageComponent } from '../../../features/news/news-image/news-image.component';

@Component({
  selector: 'app-news-list',
  templateUrl: './news-list.component.html',
  styleUrl: './news-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle, RouterLink, NewsImageComponent],
})
export class NewsListComponent {
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
}
