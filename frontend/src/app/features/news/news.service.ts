import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import type { NewsArticle, NewsFeedResponse } from './news.types';

@Injectable({ providedIn: 'root' })
export class NewsService {
  private readonly api = inject(ApiService);

  getFeed(
    category: string,
    tag = 'Todos',
    limit = 30,
    offset = 0,
  ): Observable<NewsFeedResponse> {
    const params = new URLSearchParams({
      tag,
      limit: String(limit),
      offset: String(offset),
    });
    return this.api.get<NewsFeedResponse>(`/news/feed/${category}?${params}`);
  }

  getArticle(id: string): Observable<NewsArticle> {
    return this.api.get<NewsArticle>(`/news/article/${encodeURIComponent(id)}`);
  }
}
