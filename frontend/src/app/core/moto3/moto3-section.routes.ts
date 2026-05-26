import { Routes } from '@angular/router';
import { Moto3HomePageComponent } from '../../features/moto3/moto3-home.page';
import { FormulaShellComponent } from '../series/formula-shell.component';
import { FEEDER_RACE_ROUTE } from '../series/formula-section.routes';

export const MOTO3_SECTION_ROUTES: Routes = [
  { path: '', pathMatch: 'full', component: Moto3HomePageComponent },
  FEEDER_RACE_ROUTE,
  {
    path: 'calendario',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/moto3/moto3-calendar.page').then((m) => m.Moto3CalendarPageComponent),
  },
  {
    path: 'pilotos',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/moto3/moto3-pilotos.page').then((m) => m.Moto3PilotosPageComponent),
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
      import('../../features/moto3/moto3-team-profile.page').then((m) => m.Moto3TeamProfilePageComponent),
  },
  {
    path: 'escuderias',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/moto3/moto3-teams.page').then((m) => m.Moto3TeamsPageComponent),
  },
  {
    path: 'clasificacion',
    pathMatch: 'full',
    loadComponent: () =>
      import('../../features/moto3/moto3-clasificacion.page').then((m) => m.Moto3ClasificacionPageComponent),
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

export const MOTO3_SERIES_PARENT_ROUTE = {
  component: FormulaShellComponent,
  children: MOTO3_SECTION_ROUTES,
};
