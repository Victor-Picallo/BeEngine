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
    if (
      path.startsWith('/f1/clasificacion') ||
      path.startsWith('/f2/clasificacion') ||
      path.startsWith('/f3/clasificacion') ||
      path.startsWith('/motogp/clasificacion')
    ) {
      return 'Clasificación';
    }
    if (
      path === '/f1/pilotos' ||
      path === '/f2/pilotos' ||
      path === '/f3/pilotos' ||
      path === '/motogp/pilotos'
    ) {
      return 'Pilotos';
    }
    if (
      path === '/f1/escuderias' ||
      path === '/f2/escuderias' ||
      path === '/f3/escuderias' ||
      path === '/motogp/escuderias'
    ) {
      return 'Escuderías';
    }
    if (path === '/f2' || path === '/f3' || path === '/motogp') return 'Inicio';
    if (
      /\/f[23]\/calendario\/[^/]+\/race/.test(path) ||
      /\/motogp\/calendario\/[^/]+\/[^/]+/.test(path) ||
      /\/f1\/calendario\/[^/]+\//.test(path)
    ) {
      return 'Carrera';
    }
    if (
      path.startsWith('/f2/calendario') ||
      path.startsWith('/f3/calendario') ||
      path.startsWith('/motogp/calendario')
    ) {
      return 'Calendario';
    }
    if (path.startsWith('/f1/calendario')) return 'Calendario';
    if (
      path === '/noticias' ||
      path.startsWith('/noticias/') ||
      path === '/f1/noticias' ||
      path.startsWith('/f1/noticias/') ||
      path === '/f2/noticias' ||
      path.startsWith('/f2/noticias/') ||
      path === '/f3/noticias' ||
      path.startsWith('/f3/noticias/') ||
      path === '/motogp/noticias' ||
      path.startsWith('/motogp/noticias/') ||
      path === '/moto2/noticias' ||
      path.startsWith('/moto2/noticias/') ||
      path === '/moto3/noticias' ||
      path.startsWith('/moto3/noticias/')
    ) {
      return 'Noticias';
    }
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
  goBack(fallback: string | readonly (string | number)[], returnUrl?: string | null): void {
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
