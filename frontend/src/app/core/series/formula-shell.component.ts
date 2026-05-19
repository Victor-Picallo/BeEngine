import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Contenedor de rutas hijas para /f2, /f3, etc. */
@Component({
  selector: 'app-formula-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaShellComponent {}
