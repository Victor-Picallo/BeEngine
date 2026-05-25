import { Routes } from '@angular/router';
import { MotogpHomePageComponent } from '../../features/motogp/motogp-home.page';
import { FormulaShellComponent } from '../series/formula-shell.component';

/** Sesión de GP — UI live-feed (solo MotoGP). */
export const MOTOGP_SESSION_LIVE_ROUTE: Routes[number] = {
  path: 'calendario/:race/:session',
  loadComponent: () =>
    import('../../features/motogp-live/motogp-live.page').then((m) => m.MotogpLivePageComponent),
};

export const MOTOGP_SECTION_ROUTES: Routes = [
  { path: '', pathMatch: 'full', component: MotogpHomePageComponent },
  MOTOGP_SESSION_LIVE_ROUTE,
  {
    path: 'live',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/motogp-live/motogp-live-hub.page').then((m) => m.MotogpLiveHubPageComponent),
  },
  {
    path: 'calendario',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/motogp/motogp-calendar.page').then((m) => m.MotogpCalendarPageComponent),
  },
  {
    path: 'pilotos',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/motogp/motogp-pilotos.page').then((m) => m.MotogpPilotosPageComponent),
  },
  {
    path: 'pilotos/:driverId',
    loadComponent: () =>
      import('../../features/drivers/driver-profile/f1-driver-profile.page').then(
        (m) => m.F1DriverProfilePageComponent,
      ),
  },
  {
    path: 'escuderias/:constructorId',
    loadComponent: () =>
      import('../../features/motogp/motogp-team-profile.page').then((m) => m.MotogpTeamProfilePageComponent),
  },
  {
    path: 'escuderias',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/motogp/motogp-teams.page').then((m) => m.MotogpTeamsPageComponent),
  },
  {
    path: 'clasificacion',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/motogp/motogp-clasificacion.page').then((m) => m.MotogpClasificacionPageComponent),
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
  { path: '**', redirectTo: '' },
];

export const MOTOGP_SERIES_PARENT_ROUTE = {
  component: FormulaShellComponent,
  children: MOTOGP_SECTION_ROUTES,
};
