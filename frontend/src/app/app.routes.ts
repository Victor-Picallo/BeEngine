import { Routes } from '@angular/router';
import {
  FORMULA_SECTION_ROUTES,
  FORMULA_SERIES_PARENT_ROUTE,
} from './core/series/formula-section.routes';
import { MOTOGP_SERIES_PARENT_ROUTE } from './core/motogp/motogp-section.routes';
import { MOTO2_SERIES_PARENT_ROUTE } from './core/moto2/moto2-section.routes';
import { MOTO3_SERIES_PARENT_ROUTE } from './core/moto3/moto3-section.routes';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.page').then((m) => m.LandingPageComponent),
  },
  {
    path: 'inicio',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/auth-login.page').then((m) => m.AuthLoginPageComponent),
  },
  {
    path: 'registro',
    redirectTo: 'login?tab=register',
    pathMatch: 'full',
  },

  // Live race timing — F1
  {
    path: 'f1/live',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/f1-live/f1-live.page').then((m) => m.F1LivePageComponent),
  },

  // F1 — inicio en `/`, resto bajo `/f1/...`
  ...FORMULA_SECTION_ROUTES.map((r) => ({ ...r, path: `f1/${r.path}` })),

  // Per-race session pages (solo F1)
  {
    path: 'f1/calendario/:race/:session',
    loadComponent: () =>
      import('./features/race/race-session.page').then(m => m.RaceSessionPageComponent),
  },
  {
    path: 'f1/calendario/:race',
    redirectTo: 'f1/calendario/:race/fp1',
  },

  { path: 'f1/calendar', redirectTo: 'f1/calendario', pathMatch: 'full' },

  // Rutas F1 antiguas (sin prefijo /f1)
  { path: 'pilotos', redirectTo: 'f1/pilotos', pathMatch: 'full' },
  { path: 'pilotos/:driverId', redirectTo: 'f1/pilotos/:driverId' },
  { path: 'calendario', redirectTo: 'f1/calendario', pathMatch: 'full' },
  { path: 'escuderias', redirectTo: 'f1/escuderias', pathMatch: 'full' },
  { path: 'escuderias/:constructorId', redirectTo: 'f1/escuderias/:constructorId' },
  { path: 'clasificacion', redirectTo: 'f1/clasificacion', pathMatch: 'full' },

  // F2 / F3 — home en `/f2`, `/f3` + mismas secciones (feeder race dentro del shell)
  { path: 'f2', ...FORMULA_SERIES_PARENT_ROUTE },
  { path: 'f3', ...FORMULA_SERIES_PARENT_ROUTE },

  // MotoGP y Moto2 — carpetas y rutas independientes (como F2/F3)
  { path: 'motogp', ...MOTOGP_SERIES_PARENT_ROUTE },
  { path: 'moto2',  ...MOTO2_SERIES_PARENT_ROUTE },
  { path: 'moto3',  ...MOTO3_SERIES_PARENT_ROUTE },

  {
    path: 'noticias',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/news/f1-news.page').then(m => m.F1NewsPageComponent),
  },
  {
    path: 'noticias/:articleId',
    loadComponent: () =>
      import('./features/news/f1-news-detail.page').then(m => m.F1NewsDetailPageComponent),
  },

  { path: '**', redirectTo: 'inicio' },
];
