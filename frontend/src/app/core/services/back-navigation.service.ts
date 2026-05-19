import { Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/** Navegación atrás respetando el historial in-app (p. ej. Home → ficha → volver al Home). */
@Injectable({ providedIn: 'root' })
export class BackNavigationService {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  /** URLs visitadas en esta pestaña (sincronizado con NavigationEnd y retroceso del navegador). */
  private readonly urls: string[] = [];

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        const url = e.urlAfterRedirects;
        const last = this.urls[this.urls.length - 1];
        const prev = this.urls[this.urls.length - 2];

        if (prev === url && last !== url) {
          this.urls.pop();
          return;
        }
        if (last !== url) {
          this.urls.push(url);
        }
      });
  }

  canGoBack(): boolean {
    return this.urls.length > 1;
  }

  /** Vuelve a la página anterior del historial; si no hay, usa `fallback`. */
  goBack(fallback: string | readonly string[]): void {
    if (this.canGoBack()) {
      this.location.back();
      return;
    }
    const path = typeof fallback === 'string' ? [fallback] : [...fallback];
    void this.router.navigate(path);
  }
}
