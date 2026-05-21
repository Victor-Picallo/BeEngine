import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SUB_CATEGORIES } from '../../data/sports.data';
import { isMotoCategory, MOTO_HOME_PATH, type MotoCategoryId } from './moto-categories';

export interface MotoConfig {
  id: MotoCategoryId;
  label: string;
  short: string;
  accent: string;
}

@Injectable({ providedIn: 'root' })
export class MotoContextService {
  private readonly router = inject(Router);

  readonly id = signal<MotoCategoryId>('motogp');
  readonly homePath = MOTO_HOME_PATH;

  readonly config = computed<MotoConfig>(() => {
    const cat = SUB_CATEGORIES['motogp'].find((c) => c.id === this.id()) ?? SUB_CATEGORIES['motogp'][0];
    return {
      id: this.id(),
      label: cat.label,
      short: cat.short,
      accent: cat.accent,
    };
  });

  constructor() {
    this.syncFromUrl(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationStart | NavigationEnd =>
          e instanceof NavigationStart || e instanceof NavigationEnd,
        ),
      )
      .subscribe((e) => {
        const url = e instanceof NavigationStart ? e.url : e.urlAfterRedirects;
        this.syncFromUrl(url);
      });
  }

  path(...segments: string[]): (string | number)[] {
    const root = MOTO_HOME_PATH;
    return segments.length ? [root, ...segments] : [root];
  }

  urlPath(...segments: string[]): string {
    const parts = ['motogp', ...segments].filter(Boolean);
    return `/${parts.join('/')}`;
  }

  newsPath(cat?: MotoCategoryId): string {
    const c = cat ?? this.id();
    return `/motogp/noticias?cat=${c}`;
  }

  private syncFromUrl(url: string): void {
    const [path, query = ''] = url.split('?');
    const params = new URLSearchParams(query);
    const cat = params.get('cat');
    if (cat && isMotoCategory(cat)) {
      this.id.set(cat);
      return;
    }
    if (path === MOTO_HOME_PATH || path.startsWith(`${MOTO_HOME_PATH}/`)) {
      this.id.set('motogp');
    }
  }
}
