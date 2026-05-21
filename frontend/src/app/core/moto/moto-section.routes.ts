import { Routes } from '@angular/router';
import { HomeComponent } from '../../features/home/home.component';
import { FormulaShellComponent } from '../series/formula-shell.component';
import { FEEDER_RACE_ROUTE, FORMULA_SECTION_ROUTES } from '../series/formula-section.routes';

/** Mismas secciones que F1 (calendario, pilotos, escuderías, clasificación, noticias). */
const MOTO_GP_SECTION_ROUTES: Routes = FORMULA_SECTION_ROUTES.map((r) => ({ ...r }));

export const MOTO_SECTION_ROUTES: Routes = [
  { path: '', pathMatch: 'full', component: HomeComponent },
  FEEDER_RACE_ROUTE,
  ...MOTO_GP_SECTION_ROUTES,
  { path: '**', redirectTo: '' },
];

export const MOTO_SERIES_PARENT_ROUTE = {
  component: FormulaShellComponent,
  children: MOTO_SECTION_ROUTES,
};
