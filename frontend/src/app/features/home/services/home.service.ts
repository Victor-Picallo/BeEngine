import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Category, CategoryData } from '../../../data/sports.data';

@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly api = inject(ApiService);

  getCategories(): Observable<Category[]> {
    return this.api.get<Category[]>('/categories');
  }

  getHome(category: string): Observable<CategoryData> {
    return this.api.get<CategoryData>(`/home/${category}`);
  }
}
