import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  get<T>(path: string): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(`${this.base}${path}`)
      .pipe(
        map(res => {
          if (!res.success) throw new Error(res.error ?? 'Backend error');
          return res.data;
        }),
      );
  }
}
