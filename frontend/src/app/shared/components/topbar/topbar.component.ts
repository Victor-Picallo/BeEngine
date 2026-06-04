import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ResponsiveShellService } from '../../../core/layout/responsive-shell.service';
import { Category } from '../../../data/sports.data';

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

  onCategorySelect(ev: Event): void {
    const el = ev.target;
    if (!(el instanceof HTMLSelectElement)) return;
    const id = el.value;
    if (id && id !== this.activeCat()) {
      this.catChange.emit(id);
    }
  }
}
