import { Routes } from '@angular/router';

/** Sesión de GP — UI live-feed (MotoGP / Moto2 / Moto3). */
export const MOTO_SESSION_LIVE_ROUTE: Routes[number] = {
  path: 'calendario/:race/:session',
  loadComponent: () =>
    import('../../features/moto-live/motogp-live.page').then((m) => m.MotogpLivePageComponent),
};

/** Live hub, equipos y clasificación propios de MotoGP. */
export const MOTOGP_ONLY_SECTION_ROUTES: Routes = [
  {
    path: 'live',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/moto-live/motogp-live-hub.page').then((m) => m.MotogpLiveHubPageComponent),
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
];

/** @deprecated Usar MOTO_SESSION_LIVE_ROUTE */
export const MOTOGP_SESSION_ROUTE = MOTO_SESSION_LIVE_ROUTE;

/** @deprecated Renombrado a MOTOGP_ONLY_SECTION_ROUTES + MOTO_COMMON_SECTION_ROUTES. */
export const MOTOGP_OWN_SECTION_ROUTES = [
  ...MOTOGP_ONLY_SECTION_ROUTES,
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
] satisfies Routes;
