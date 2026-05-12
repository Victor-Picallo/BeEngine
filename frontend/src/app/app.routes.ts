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

  { path: '**', redirectTo: '' },
];
