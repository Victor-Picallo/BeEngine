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
import { homePathForSeries, newsPathForSeries } from '../../../core/series/series.config';
import { isFormulaAppRoute } from '../../../core/series/formula-route';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [TopbarComponent],
  template: `
    <app-topbar
      [categories]="displayCategories()"
      [activeCat]="activeCat()"
      [accent]="accent()"
      [homeLink]="seriesCtx.homePath()"
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

  readonly displayCategories = computed(() => HEADER_CATEGORIES);

  readonly activeCat = computed(() => {
    if (this.inFormulaApp()) return 'f1';
    const path = this.urlPath();
    if (path.startsWith('/noticias')) {
      const q = new URLSearchParams(this.router.url.split('?')[1] ?? '');
      return q.get('cat') === 'motogp' ? 'motogp' : 'f1';
    }
    return 'f1';
  });

  readonly accent = computed(() => {
    const cat = HEADER_CATEGORIES.find((c) => c.id === this.activeCat());
    return cat?.accent ?? '#FFD100';
  });

  onCatChange(id: string): void {
    if (id === 'motogp') {
      void this.router.navigate(['/noticias'], { queryParams: { cat: 'motogp', page: null } });
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
