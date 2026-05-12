import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { SUB_CATEGORIES, type Category, type Favorite } from '../../../data/sports.data';

const DEFAULT_SECTIONS = ['Noticias', 'Calendario', 'Resultados', 'Estadísticas', 'Vídeos'];

@Component({
  selector: 'app-side',
  standalone: true,
  imports: [SidebarComponent],
  template: `
    <app-sidebar
      [categories]="categories()"
      [activeCat]="activeCat()"
      [accent]="accent()"
      [favorites]="favorites()"
      [sections]="sections()">
    </app-sidebar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidebarComponent {
  // Calendar / race / live pages are F1-context — show the F1 series tree.
  readonly categories = signal<Category[]>(SUB_CATEGORIES['f1']);
  readonly activeCat  = signal('f1');
  readonly favorites  = signal<Favorite[]>([]);
  readonly sections   = signal<string[]>(DEFAULT_SECTIONS);

  readonly currentCat = computed(
    () => this.categories().find(c => c.id === this.activeCat()) ?? this.categories()[0],
  );
  readonly accent = computed(() => this.currentCat()?.accent ?? '#FFD100');
}
