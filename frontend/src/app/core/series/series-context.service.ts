import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SERIES_CONFIG, seriesFromUrl } from './series.config';
import type { SeriesConfig, SeriesId } from './series.types';

@Injectable({ providedIn: 'root' })
export class SeriesContextService {
  private readonly router = inject(Router);

  readonly id = signal<SeriesId>('f1');
  readonly config = computed<SeriesConfig>(() => SERIES_CONFIG[this.id()]);
  readonly apiPrefix = computed(() => `/${this.id()}`);
  readonly routePrefix = computed(() => this.config().routePrefix);
  readonly homePath = computed(() => (this.id() === 'f1' ? '/' : this.routePrefix()));

  constructor() {
    this.syncFromUrl(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationStart | NavigationEnd =>
          e instanceof NavigationStart || e instanceof NavigationEnd,
        ),
      )
      .subscribe((e) => {
        const url =
          e instanceof NavigationStart ? e.url : e.urlAfterRedirects;
        this.syncFromUrl(url);
      });
  }

  setSeries(id: SeriesId): void {
    this.id.set(id);
  }

  /** Segmentos para `routerLink`, p. ej. `['f2', 'pilotos', id]`. */
  path(...segments: string[]): (string | number)[] {
    if (this.id() === 'f1') {
      return segments.length ? ['f1', ...segments] : ['/'];
    }
    return segments.length ? [this.id(), ...segments] : [this.id()];
  }

  /** Ruta URL absoluta, p. ej. `/f2/pilotos`. */
  urlPath(...segments: string[]): string {
    if (this.id() === 'f1' && segments.length === 0) return '/';
    const parts = [this.id(), ...segments].filter(Boolean);
    return `/${parts.join('/')}`;
  }

  private syncFromUrl(url: string): void {
    this.id.set(seriesFromUrl(url));
  }
}
