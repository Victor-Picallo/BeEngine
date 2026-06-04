import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import type { NewsArticle, NewsFeedResponse } from './news.types';

/** Intervalo de polling en la página de noticias (RSS en vivo). */
export const NEWS_LIVE_POLL_MS = 90_000;

@Injectable({ providedIn: 'root' })
export class NewsService {
  private readonly api = inject(ApiService);

  private feedPath(category: string, tag: string, limit: number, offset: number): string {
    const params = new URLSearchParams({
      tag,
      limit: String(limit),
      offset: String(offset),
    });
    return `/news/feed/${category}?${params}`;
  }

  /** DB rápida y, en segundo plano, RSS actualizado (`refresh=live`). */
  getFeed(
    category: string,
    tag = 'Todos',
    limit = 30,
    offset = 0,
  ): Observable<NewsFeedResponse> {
    return this.api.getDbThenLive<NewsFeedResponse>(this.feedPath(category, tag, limit, offset));
  }

  /** Solo RSS en vivo (polling / refresco manual). */
  getFeedLive(
    category: string,
    tag = 'Todos',
    limit = 30,
    offset = 0,
  ): Observable<NewsFeedResponse> {
    return this.api.get<NewsFeedResponse>(this.feedPath(category, tag, limit, offset), {
      liveRefresh: true,
    });
  }

  getArticle(id: string): Observable<NewsArticle & { source?: string }> {
    return this.api.getDbThenLive<NewsArticle & { source?: string }>(
      `/news/article/${encodeURIComponent(id)}`,
    );
  }
}
