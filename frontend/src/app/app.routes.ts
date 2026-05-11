import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'f1/live',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/f1-live/f1-live.page').then(m => m.F1LivePageComponent),
  },
  {
    path: 'f1/calendar',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/calendar/f1-calendar.page').then(m => m.F1CalendarPageComponent),
  },
  {
    path: 'f1/live/fp1',
    loadComponent: () => import('./features/f1-live/f1-fp1.page').then(m => m.F1Fp1PageComponent),
  },
  {
    path: 'f1/live/fp2',
    loadComponent: () => import('./features/f1-live/f1-fp2.page').then(m => m.F1Fp2PageComponent),
  },
  {
    path: 'f1/live/fp3',
    loadComponent: () => import('./features/f1-live/f1-fp3.page').then(m => m.F1Fp3PageComponent),
  },
  {
    path: 'f1/live/qualy-sprint',
    loadComponent: () => import('./features/f1-live/f1-qualy-sprint.page').then(m => m.F1QualySprintPageComponent),
  },
  {
    path: 'f1/live/sprint',
    loadComponent: () => import('./features/f1-live/f1-sprint.page').then(m => m.F1SprintPageComponent),
  },
  {
    path: 'f1/live/qualy',
    loadComponent: () => import('./features/f1-live/f1-qualy.page').then(m => m.F1QualyPageComponent),
  },
  { path: '**', redirectTo: '' },
];
