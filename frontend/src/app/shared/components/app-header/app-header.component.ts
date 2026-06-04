import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { TopbarComponent } from '../topbar/topbar.component';
import { HEADER_CATEGORIES, headerWorldFromCategory } from '../../../data/sports.data';
import { SeriesContextService } from '../../../core/series/series-context.service';
import { homePathForSeries, newsPathForSeries } from '../../../core/series/series.config';
import { formulaSeriesFromUrl, isFormulaAppRoute } from '../../../core/series/formula-route';
import { isMotoAppRoute, isMotoCategory } from '../../../core/series/series-moto';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [TopbarComponent],
  template: `
    <app-topbar
      [categories]="displayCategories()"
      [activeCat]="topbarWorld()"
      [accent]="accent()"
      [homeLink]="homeLink()"
      (catChange)="onCatChange($event)">
    </app-topbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent {
  private readonly router = inject(Router);
  readonly seriesCtx = inject(SeriesContextService);
  private readonly urlPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split('?')[0]),
      startWith(this.router.url.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  readonly inFormulaApp = computed(() => isFormulaAppRoute(this.urlPath()));

  readonly inMotoApp = computed(() => isMotoAppRoute(this.urlPath()));

  readonly displayCategories = computed(() => HEADER_CATEGORIES);

  readonly homeLink = computed(() => this.seriesCtx.homePath());

  /** Serie/categoría real según la ruta (sidebar, contexto). */
  readonly activeCat = computed(() => {
    if (this.inMotoApp()) {
      const seg = this.urlPath().split('/')[1];
      return isMotoCategory(seg) ? seg : 'motogp';
    }
    if (this.inFormulaApp()) return formulaSeriesFromUrl(this.urlPath());
    const path = this.urlPath();
    if (path.startsWith('/noticias')) {
      const q = new URLSearchParams(this.router.url.split('?')[1] ?? '');
      const cat = q.get('cat') ?? '';
      return isMotoCategory(cat) ? cat : 'f1';
    }
    return 'f1';
  });

  /** Mundo del topbar: solo F1 o MotoGP. */
  readonly topbarWorld = computed(() => headerWorldFromCategory(this.activeCat()));

  readonly accent = computed(() => this.seriesCtx.config().accent);

  onCatChange(id: string): void {
    if (id === 'motogp') {
      void this.router.navigateByUrl('/motogp');
      return;
    }
    if (id === 'f1') {
      const url = this.urlPath();
      const dest = url.includes('/noticias') ? newsPathForSeries('f1') : homePathForSeries('f1');
      void this.router.navigateByUrl(dest);
      return;
    }
  }
}
