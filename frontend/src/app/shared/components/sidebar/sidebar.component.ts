import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReturnNavDirective } from '../../../core/directives/return-nav.directive';
import { Category, Favorite } from '../../../data/sports.data';
import { f1SidebarSectionPath } from '../../f1-sidebar-sections';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle, RouterLink, ReturnNavDirective],
})
export class SidebarComponent {
  categories = input.required<Category[]>();
  activeCat  = input.required<string>();
  accent     = input.required<string>();
  favorites  = input.required<Favorite[]>();
  sections   = input.required<string[]>();

  /** Ruta Angular para secciones con página; `null` → botón placeholder. */
  readonly sectionPath = f1SidebarSectionPath;

  catChange = output<string>();
}
