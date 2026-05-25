import { Routes } from '@angular/router';
import { Moto2HomePageComponent } from '../../features/moto2/moto2-home.page';
import { FormulaShellComponent } from '../series/formula-shell.component';
import { FEEDER_RACE_ROUTE } from '../series/formula-section.routes';

export const MOTO2_SECTION_ROUTES: Routes = [
  { path: '', pathMatch: 'full', component: Moto2HomePageComponent },
  FEEDER_RACE_ROUTE,
  {
    path: 'calendario',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/moto2/moto2-calendar.page').then((m) => m.Moto2CalendarPageComponent),
  },
  {
    path: 'pilotos',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/moto2/moto2-pilotos.page').then((m) => m.Moto2PilotosPageComponent),
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
      import('../../features/moto2/moto2-team-profile.page').then((m) => m.Moto2TeamProfilePageComponent),
  },
  {
    path: 'escuderias',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/moto2/moto2-teams.page').then((m) => m.Moto2TeamsPageComponent),
  },
  {
    path: 'clasificacion',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/moto2/moto2-clasificacion.page').then((m) => m.Moto2ClasificacionPageComponent),
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

export const MOTO2_SERIES_PARENT_ROUTE = {
  component: FormulaShellComponent,
  children: MOTO2_SECTION_ROUTES,
};
