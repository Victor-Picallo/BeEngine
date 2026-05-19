import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },

  // Live race timing — ONLY for the currently live race
  {
    path: 'f1/live',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/f1-live/f1-live.page').then(m => m.F1LivePageComponent),
  },

  // F1 calendar (Spanish path)
  {
    path: 'f1/calendario',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/calendar/f1-calendar.page').then(m => m.F1CalendarPageComponent),
  },

  {
    path: 'f1/pilotos',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/drivers/f1-drivers.page').then(m => m.F1DriversPageComponent),
  },

  {
    path: 'f1/escuderias/:constructorId',
    loadComponent: () =>
      import('./features/constructors/constructor-profile/f1-constructor-profile.page').then(
        m => m.F1ConstructorProfilePageComponent,
      ),
  },

  {
    path: 'f1/escuderias',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/constructors/f1-constructors.page').then(m => m.F1ConstructorsPageComponent),
  },

  {
    path: 'f1/pilotos/:driverId',
    loadComponent: () =>
      import('./features/drivers/driver-profile/f1-driver-profile.page').then(
        m => m.F1DriverProfilePageComponent,
      ),
  },

  // Per-race session pages: /f1/calendario/{race-slug}/{session}
  {
    path: 'f1/calendario/:race/:session',
    loadComponent: () =>
      import('./features/race/race-session.page').then(m => m.RaceSessionPageComponent),
  },
  // Race without session → default to FP1
  {
    path: 'f1/calendario/:race',
    redirectTo: 'f1/calendario/:race/fp1',
  },

  // Back-compat: old English path
  { path: 'f1/calendar', redirectTo: 'f1/calendario', pathMatch: 'full' },

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
