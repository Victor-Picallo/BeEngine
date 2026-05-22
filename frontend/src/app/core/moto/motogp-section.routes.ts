import { Routes } from '@angular/router';

/** Rutas de sección solo MotoGP (no reutilizan páginas F1 para equipos/clasificación). */
export const MOTOGP_OWN_SECTION_ROUTES: Routes = [
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
