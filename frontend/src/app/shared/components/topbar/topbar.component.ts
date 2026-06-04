import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ResponsiveShellService } from '../../../core/layout/responsive-shell.service';
import { Category, headerWorldFromCategory } from '../../../data/sports.data';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle, RouterLink],
})
export class TopbarComponent {
  readonly shell = inject(ResponsiveShellService);

  categories = input.required<Category[]>();
  activeCat  = input.required<string>();
  accent     = input.required<string>();
  /** Inicio de la categoría activa (`/inicio`, `/f2`, `/motogp`, …). */
  homeLink   = input<string>('/inicio');

  catChange = output<string>();

  /** Mundo activo en el header (solo F1 o MotoGP), aunque la ruta sea F2/F3/Moto2/Moto3. */
  readonly displayWorld = computed(() => headerWorldFromCategory(this.activeCat()));

  onCategoryClick(id: string): void {
    if (id !== this.displayWorld()) {
      this.catChange.emit(id);
    }
  }

  onCategorySelect(ev: Event): void {
    const el = ev.target;
    if (!(el instanceof HTMLSelectElement)) return;
    const id = el.value;
    if (id && id !== this.displayWorld()) {
      this.catChange.emit(id);
    }
  }
}
