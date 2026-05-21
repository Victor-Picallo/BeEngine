import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, merge, startWith } from 'rxjs';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { SeriesContextService } from '../../../core/series/series-context.service';
import { FORMULA_SERIES_IDS, homePathForSeries, SERIES_CONFIG } from '../../../core/series/series.config';
import { isFormulaAppRoute } from '../../../core/series/formula-route';
import {
  isMotoAppRoute,
  isMotoCategory,
  isMotoNewsRoute,
  MOTO_HOME_PATH,
  MOTO_SIDEBAR_CATEGORIES,
  type MotoCategoryId,
} from '../../../core/moto/moto-categories';
import { MOTO_SECTION_LABELS } from '../../../core/moto/moto-sidebar';
import { SERIES_SECTION_LABELS } from '../../../core/series/series-sidebar';
import type { Category, Favorite } from '../../../data/sports.data';
import type { SeriesId } from '../../../core/series/series.types';

const FORMULA_SIDEBAR_CATEGORIES: Category[] = FORMULA_SERIES_IDS.map((id) => {
  const c = SERIES_CONFIG[id];
  return { id: c.id, label: c.label, short: c.short, accent: c.accent };
});

function queryCatFromRouter(router: Router): string | null {
  let route = router.routerState.root;
  while (route.firstChild) {
    route = route.firstChild;
  }
  return route.snapshot.queryParamMap.get('cat');
}

@Component({
  selector: 'app-side',
  standalone: true,
  imports: [SidebarComponent],
  template: `
    <app-sidebar
      [categories]="categories()"
      [activeCat]="activeCat()"
      [accent]="accent()"
      [favorites]="favorites()"
      [sections]="sections()"
      [motoMode]="inMotoApp()"
      [motoSectionCat]="motoSectionCat()"
      (catChange)="onCategoryChange($event)">
    </app-sidebar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidebarComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seriesCtx = inject(SeriesContextService);

  favorites = input<Favorite[]>([]);
  motoNews = input<boolean | undefined>(undefined);
  newsCat = input<string | undefined>(undefined);

  private readonly urlPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split('?')[0]),
      startWith(this.router.url.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  private readonly routeNewsCat = toSignal(
    merge(
      this.route.queryParamMap,
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(() => this.route.snapshot.queryParamMap),
      ),
    ).pipe(map((params) => params.get('cat') ?? queryCatFromRouter(this.router))),
    { initialValue: queryCatFromRouter(this.router) },
  );

  readonly inFormulaApp = computed(() => isFormulaAppRoute(this.urlPath()));

  readonly inMotoApp = computed(() => {
    const forced = this.motoNews();
    if (forced === true) return true;
    if (forced === false) return false;
    return isMotoAppRoute(this.urlPath()) || isMotoNewsRoute(this.urlPath(), this.routeNewsCat());
  });

  readonly categories = computed(() =>
    this.inMotoApp() ? MOTO_SIDEBAR_CATEGORIES : FORMULA_SIDEBAR_CATEGORIES,
  );

  readonly sections = computed(() =>
    this.inMotoApp() ? [...MOTO_SECTION_LABELS] : [...SERIES_SECTION_LABELS],
  );

  readonly motoSectionCat = computed((): MotoCategoryId => {
    const fromInput = this.newsCat();
    if (fromInput && isMotoCategory(fromInput)) return fromInput;
    const cat = this.routeNewsCat();
    return cat && isMotoCategory(cat) ? cat : 'motogp';
  });

  readonly activeCat = computed(() => {
    if (this.inMotoApp()) return this.motoSectionCat();
    return this.seriesCtx.id();
  });

  readonly accent = computed(() => {
    const id = this.activeCat();
    const cat = this.categories().find((c) => c.id === id);
    if (cat) return cat.accent;
    return this.seriesCtx.config().accent;
  });

  onCategoryChange(id: string): void {
    if (isMotoCategory(id)) {
      if (id === 'motogp') {
        void this.router.navigateByUrl(MOTO_HOME_PATH);
        return;
      }
      void this.router.navigate(['/motogp/noticias'], {
        queryParams: { cat: id, page: null },
      });
      return;
    }

    const seriesId = id as SeriesId;
    if (seriesId !== 'f1' && seriesId !== 'f2' && seriesId !== 'f3') return;
    if (seriesId === this.seriesCtx.id()) return;
    void this.router.navigateByUrl(homePathForSeries(seriesId));
  }
}
