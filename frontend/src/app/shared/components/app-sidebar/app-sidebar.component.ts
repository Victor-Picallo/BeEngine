import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ResponsiveShellService } from '../../../core/layout/responsive-shell.service';
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
  motoSeriesFromUrl,
  MOTO_SIDEBAR_CATEGORIES,
} from '../../../core/series/series-moto';
import { MOTO_SECTION_LABELS, SERIES_SECTION_LABELS } from '../../../core/series/series-sidebar';
import type { Category } from '../../../data/sports.data';
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
  styleUrls: ['./app-sidebar.component.css'],
  template: `
    <div class="shell-sidebar-host">
      <button
        type="button"
        class="shell-sidebar-backdrop"
        [class.shell-sidebar-backdrop--visible]="shell.sidebarOpen()"
        aria-label="Cerrar menú"
        (click)="shell.closeSidebar()"
      ></button>
      <app-sidebar
        [class.app-sidebar--drawer-open]="shell.sidebarOpen()"
        [categories]="categories()"
        [activeCat]="activeCat()"
        [accent]="accent()"
        [sections]="sections()"
        [sectionSeriesId]="sectionSeriesId()"
        (catChange)="onCategoryChange($event)">
      </app-sidebar>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidebarComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seriesCtx = inject(SeriesContextService);
  readonly shell = inject(ResponsiveShellService);

  motoNews = input<boolean | undefined>(undefined);
  newsCat = input<string | undefined>(undefined);
  catChange = output<string>();

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

  readonly sectionSeriesId = computed((): SeriesId | null => {
    if (!this.inMotoApp()) return null;
    const fromInput = this.newsCat();
    if (fromInput && isMotoCategory(fromInput)) return fromInput;
    return motoSeriesFromUrl(`${this.urlPath()}?cat=${this.routeNewsCat() ?? ''}`);
  });

  readonly activeCat = computed(() => {
    if (this.inMotoApp()) return this.sectionSeriesId() ?? 'motogp';
    return this.seriesCtx.id();
  });

  readonly accent = computed(() => {
    const id = this.activeCat();
    const cat = this.categories().find((c) => c.id === id);
    if (cat) return cat.accent;
    return this.seriesCtx.config().accent;
  });

  onCategoryChange(id: string): void {
    this.catChange.emit(id);
    this.shell.closeSidebar();
    if (isMotoCategory(id)) {
      void this.router.navigateByUrl(`/${id}`);
      return;
    }

    const seriesId = id as SeriesId;
    if (seriesId !== 'f1' && seriesId !== 'f2' && seriesId !== 'f3') return;
    if (seriesId === this.seriesCtx.id()) return;
    void this.router.navigateByUrl(homePathForSeries(seriesId));
  }
}
