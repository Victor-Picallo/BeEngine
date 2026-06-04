import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { DataSource } from '../data-source';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface SourcedData<T> {
  source?: DataSource;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  private pathWithRefresh(path: string, liveRefresh: boolean): string {
    if (!liveRefresh) return path;
    return path.includes('?') ? `${path}&refresh=live` : `${path}?refresh=live`;
  }

  get<T>(path: string, options?: { liveRefresh?: boolean }): Observable<T> {
    const url = `${this.base}${this.pathWithRefresh(path, !!options?.liveRefresh)}`;
    return this.http.get<ApiResponse<T>>(url).pipe(
      map((res) => {
        if (!res.success) throw new Error(res.error ?? 'Backend error');
        return res.data;
      }),
    );
  }

  /**
   * Emite primero datos de DB (rápido) y, si la API en vivo responde, vuelve a emitir.
   * Si el RSS llega antes que la DB, no se pisa el live con el snapshot de DB.
   */
  getDbThenLive<T>(path: string): Observable<T> {
    return new Observable<T>((observer) => {
      let gotDb = false;
      let gotLive = false;
      let settled = 0;

      const settle = () => {
        settled += 1;
        if (settled >= 2) observer.complete();
      };

      const isLivePayload = (value: T) => {
        const src = String((value as SourcedData<unknown>)?.source ?? '');
        return src !== 'db' && src !== 'empty' && src !== '';
      };

      const subDb = this.get<T>(path).subscribe({
        next: (value) => {
          gotDb = true;
          if (!gotLive) observer.next(value);
        },
        error: (err) => {
          if (!gotDb && !gotLive) observer.error(err);
          settle();
        },
        complete: () => settle(),
      });

      const subLive = this.get<T>(path, { liveRefresh: true }).subscribe({
        next: (value) => {
          if (isLivePayload(value)) {
            gotLive = true;
            observer.next(value);
          } else if (!gotDb) {
            observer.next(value);
          }
        },
        error: () => settle(),
        complete: () => settle(),
      });

      return () => {
        subDb.unsubscribe();
        subLive.unsubscribe();
      };
    });
  }
}
