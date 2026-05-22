import { Routes } from '@angular/router';
import { MotoHomePageComponent } from '../../features/moto/moto-home.page';
import { FormulaShellComponent } from '../series/formula-shell.component';
import { FEEDER_RACE_ROUTE } from '../series/formula-section.routes';
import { MOTOGP_OWN_SECTION_ROUTES } from './motogp-section.routes';

export const MOTO_SECTION_ROUTES: Routes = [
  { path: '', pathMatch: 'full', component: MotoHomePageComponent },
  FEEDER_RACE_ROUTE,
  ...MOTOGP_OWN_SECTION_ROUTES,
  { path: '**', redirectTo: '' },
];

export const MOTO_SERIES_PARENT_ROUTE = {
  component: FormulaShellComponent,
  children: MOTO_SECTION_ROUTES,
};
