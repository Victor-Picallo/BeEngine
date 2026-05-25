import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import {
  FORMULA_SECTION_ROUTES,
  FORMULA_SERIES_PARENT_ROUTE,
} from './core/series/formula-section.routes';
import { motoSeriesParentRoute } from './core/moto/moto-section.routes';

export const routes: Routes = [
  { path: '', component: HomeComponent },

  // Live race timing — F1
  {
    path: 'f1/live',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/f1-live/f1-live.page').then((m) => m.F1LivePageComponent),
  },

  // MotoGP Live → GP/sesión activos en calendario
  {
    path: 'motogp/live',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/moto-live/motogp-live-hub.page').then((m) => m.MotogpLiveHubPageComponent),
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

  // MotoGP / Moto2 / Moto3 — cada categoría bajo su prefijo
  { path: 'motogp', ...motoSeriesParentRoute('motogp') },
  { path: 'moto2',  ...motoSeriesParentRoute('moto2') },
  { path: 'moto3',  ...motoSeriesParentRoute('moto3') },

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

  { path: '**', redirectTo: '' },
];
