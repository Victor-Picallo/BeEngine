import { inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Viewport &lt; 1024px: layout móvil/tablet (escritorio congelado ≥1024px). */
export const DESKTOP_MIN_PX = 1024;

@Injectable({ providedIn: 'root' })
export class ResponsiveShellService {
  private readonly router = inject(Router);

  readonly sidebarOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.closeSidebar());
  }

  toggleSidebar(): void {
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
