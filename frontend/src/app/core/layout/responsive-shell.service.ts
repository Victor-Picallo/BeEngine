import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

/** Viewport &lt; 1024px: layout móvil/tablet (escritorio congelado ≥1024px). */
export const DESKTOP_MIN_PX = 1024;

/** Rutas con sidebar lateral (menú hamburguesa en móvil). */
export function routeHasAppSidebar(path: string): boolean {
  const p = path.split('?')[0];
  if (!p || p === '/' || p.startsWith('/login')) return false;
  if (p === '/f1/live' || p === '/motogp/live') return false;
  return true;
}

@Injectable({ providedIn: 'root' })
export class ResponsiveShellService {
  private readonly router = inject(Router);

  readonly sidebarOpen = signal(false);
  private readonly sidebarMountCount = signal(0);

  private readonly urlPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split('?')[0]),
      startWith(this.router.url.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  /** Muestra el botón ☰ en móvil (por ruta, no depende solo del ciclo de vida del sidebar). */
  readonly showMobileMenu = computed(() => routeHasAppSidebar(this.urlPath()));

  readonly sidebarReady = computed(() => this.sidebarMountCount() > 0);

  registerSidebar(): void {
    this.sidebarMountCount.update((n) => n + 1);
  }

  unregisterSidebar(): void {
    this.sidebarMountCount.update((n) => Math.max(0, n - 1));
    this.sidebarOpen.set(false);
    this.syncBodyScrollLock();
  }

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.closeSidebar());
  }

  toggleSidebar(): void {
    if (!this.sidebarReady()) return;
    this.sidebarOpen.update((v) => !v);
    this.syncBodyScrollLock();
  }

  closeSidebar(): void {
    if (!this.sidebarOpen()) return;
    this.sidebarOpen.set(false);
    this.syncBodyScrollLock();
  }

  private syncBodyScrollLock(): void {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('shell-sidebar-open', this.sidebarOpen());
  }
}
