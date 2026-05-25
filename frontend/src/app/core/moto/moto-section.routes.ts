import { Routes } from '@angular/router';
import { MotoHomePageComponent } from '../../features/moto/moto-home.page';
import { FormulaShellComponent } from '../series/formula-shell.component';
import type { MotoCategoryId } from './moto-categories';
import { MOTOGP_ONLY_SECTION_ROUTES, MOTO_SESSION_LIVE_ROUTE } from './motogp-section.routes';

/** Calendario, pilotos y noticias — compartido MotoGP / Moto2 / Moto3. */
export const MOTO_COMMON_SECTION_ROUTES: Routes = [
  {
    path: 'calendario',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/moto/moto-calendar.page').then((m) => m.MotoCalendarPageComponent),
  },
  {
    path: 'pilotos',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/moto/moto-pilotos.page').then((m) => m.MotoPilotosPageComponent),
  },
  {
    path: 'pilotos/:driverId',
    loadComponent: () =>
      import('../../features/drivers/driver-profile/f1-driver-profile.page').then(
        (m) => m.F1DriverProfilePageComponent,
      ),
  },
  {
    path: 'noticias',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/news/f1-news.page').then((m) => m.F1NewsPageComponent),
  },
  {
    path: 'noticias/:articleId',
    loadComponent: () =>
      import('../../features/news/f1-news-detail.page').then((m) => m.F1NewsDetailPageComponent),
  },
];

export function buildMotoSectionRoutes(seriesId: MotoCategoryId): Routes {
  const sessionRoute = MOTO_SESSION_LIVE_ROUTE;
  const extra =
    seriesId === 'motogp'
      ? [...MOTOGP_ONLY_SECTION_ROUTES, ...MOTO_COMMON_SECTION_ROUTES]
      : MOTO_COMMON_SECTION_ROUTES;

  return [
    { path: '', pathMatch: 'full', component: MotoHomePageComponent },
    sessionRoute,
    ...extra,
    { path: '**', redirectTo: '' },
  ];
}

/** @deprecated Usar `buildMotoSectionRoutes('motogp')` — solo compat tests/import legacy. */
export const MOTO_SECTION_ROUTES = buildMotoSectionRoutes('motogp');

export const motoSeriesParentRoute = (seriesId: MotoCategoryId) => ({
  component: FormulaShellComponent,
  children: buildMotoSectionRoutes(seriesId),
});

/** @deprecated Usar `motoSeriesParentRoute(id)` en app.routes. */
export const MOTO_SERIES_PARENT_ROUTE = motoSeriesParentRoute('motogp');
