import { Routes } from '@angular/router';
import { HomeComponent } from '../../features/home/home.component';
import { FormulaShellComponent } from './formula-shell.component';

/** Páginas compartidas F1 / F2 / F3 (misma UI, serie vía URL). */
export const FORMULA_SECTION_ROUTES: Routes = [
  {
    path: 'calendario',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/calendar/f1-calendar.page').then((m) => m.F1CalendarPageComponent),
  },
  {
    path: 'pilotos',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/drivers/f1-drivers.page').then((m) => m.F1DriversPageComponent),
  },
  {
    path: 'clasificacion',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/standings/f1-clasificacion.page').then((m) => m.F1ClasificacionPageComponent),
  },
  {
    path: 'escuderias/:constructorId',
    loadComponent: () =>
      import('../../features/constructors/constructor-profile/f1-constructor-profile.page').then(
        (m) => m.F1ConstructorProfilePageComponent,
      ),
  },
  {
    path: 'escuderias',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/constructors/f1-constructors.page').then((m) => m.F1ConstructorsPageComponent),
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

/** Resultado por sesión (F2/F3/MotoGP). MotoGP: fp1, q1, sprint, race… */
export const FEEDER_RACE_ROUTE: Routes[number] = {
  path: 'calendario/:race/:session',
  loadComponent: () =>
    import('../../features/race/feeder-race.page').then((m) => m.FeederRacePageComponent),
};

/** Home + secciones para una serie (f2, f3). F1 usa `/` como inicio. */
export function formulaSeriesChildRoutes(): Routes {
  return [
    { path: '', pathMatch: 'full', component: HomeComponent },
    FEEDER_RACE_ROUTE,
    ...FORMULA_SECTION_ROUTES,
    { path: '**', redirectTo: '' },
  ];
}

export const FORMULA_SERIES_PARENT_ROUTE = {
  component: FormulaShellComponent,
  children: formulaSeriesChildRoutes(),
};
