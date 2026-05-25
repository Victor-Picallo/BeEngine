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
import { HEADER_CATEGORIES } from '../../../data/sports.data';
import { SeriesContextService } from '../../../core/series/series-context.service';
import { MotoContextService } from '../../../core/moto/moto-context.service';
import { homePathForSeries, newsPathForSeries } from '../../../core/series/series.config';
import { isFormulaAppRoute } from '../../../core/series/formula-route';
import { isMotoAppRoute, isMotoCategory } from '../../../core/moto/moto-categories';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [TopbarComponent],
  template: `
    <app-topbar
      [categories]="displayCategories()"
      [activeCat]="activeCat()"
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
  private readonly motoCtx = inject(MotoContextService);

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

  readonly homeLink = computed(() =>
    this.inMotoApp() ? this.motoCtx.homePath() : this.seriesCtx.homePath(),
  );

  readonly activeCat = computed(() => {
    if (this.inMotoApp()) return 'motogp';
    if (this.inFormulaApp()) return 'f1';
    const path = this.urlPath();
    if (path.startsWith('/noticias')) {
      const q = new URLSearchParams(this.router.url.split('?')[1] ?? '');
      const cat = q.get('cat') ?? '';
      return isMotoCategory(cat) ? 'motogp' : 'f1';
    }
    return 'f1';
  });

  readonly accent = computed(() =>
    this.inMotoApp() ? this.motoCtx.config().accent : this.seriesCtx.config().accent,
  );

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
