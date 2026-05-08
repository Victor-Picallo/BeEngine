import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'f1/live',
    loadComponent: () =>
      import('./features/f1-live/f1-live.page').then(m => m.F1LivePageComponent),
  },
  { path: '**', redirectTo: '' },
];
