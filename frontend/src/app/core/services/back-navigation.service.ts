import { Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export const RETURN_URL_STATE_KEY = 'returnUrl';

/** Navegación atrás respetando el origen (Home, clasificación, listados, etc.). */
@Injectable({ providedIn: 'root' })
export class BackNavigationService {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  private readonly urls: string[] = [];

  constructor() {
    const initial = this.router.url;
    if (initial) {
      this.urls.push(initial);
    }

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

  /** Estado para `routerLink` / `navigate` — guarda la URL actual como origen. */
  linkState(): { [RETURN_URL_STATE_KEY]: string } {
    return { [RETURN_URL_STATE_KEY]: this.router.url };
  }

  /** Lee el origen al abrir una ficha (constructor o ngOnInit). */
  captureReturnUrl(): string | null {
    const nav = this.router.getCurrentNavigation();
    const fromNav = nav?.extras?.state?.[RETURN_URL_STATE_KEY];
    if (typeof fromNav === 'string' && fromNav.length > 0) {
      return fromNav;
    }
    const hist = history.state?.[RETURN_URL_STATE_KEY];
    if (typeof hist === 'string' && hist.length > 0) {
      return hist;
    }
    return null;
  }

  /** Etiqueta corta para el botón «atrás» según la URL de origen. */
  labelFor(returnUrl: string | null, fallbackPath: string): string {
    const path = (returnUrl ?? fallbackPath).split('?')[0];
    if (path === '/' || path === '') return 'Inicio';
    if (path.startsWith('/f1/clasificacion')) return 'Clasificación';
    if (path === '/f1/pilotos') return 'Pilotos';
    if (path === '/f1/escuderias') return 'Escuderías';
    if (path.startsWith('/f1/calendario')) return 'Calendario';
    if (path.startsWith('/noticias')) return 'Noticias';
    if (path.startsWith('/f1/live')) return 'En vivo';
    return 'Volver';
  }

  canGoBackInApp(): boolean {
    return this.urls.length > 1;
  }

  /**
   * Vuelve al origen si se pasó `returnUrl`; si no, al historial del navegador;
   * si tampoco hay, a `fallback`.
   */
  goBack(fallback: string | readonly string[], returnUrl?: string | null): void {
    if (returnUrl) {
      void this.router.navigateByUrl(returnUrl);
      return;
    }
    if (this.canGoBackInApp()) {
      this.location.back();
      return;
    }
    const path = typeof fallback === 'string' ? [fallback] : [...fallback];
    void this.router.navigate(path);
  }
}
