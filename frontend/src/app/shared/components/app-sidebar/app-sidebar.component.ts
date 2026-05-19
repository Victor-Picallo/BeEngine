import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { SeriesContextService } from '../../../core/series/series-context.service';
import { FORMULA_SERIES_IDS, homePathForSeries, SERIES_CONFIG } from '../../../core/series/series.config';
import { SERIES_SECTION_LABELS } from '../../../core/series/series-sidebar';
import type { Category, Favorite } from '../../../data/sports.data';

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
      [sections]="sections()"
      (catChange)="onSeriesChange($event)">
    </app-sidebar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidebarComponent {
  private readonly router = inject(Router);
  private readonly seriesCtx = inject(SeriesContextService);

  favorites = input<Favorite[]>([]);

  readonly categories = signal<Category[]>(
    FORMULA_SERIES_IDS.map((id) => {
      const c = SERIES_CONFIG[id];
      return { id: c.id, label: c.label, short: c.short, accent: c.accent };
    }),
  );

  readonly activeCat = computed(() => this.seriesCtx.id());
  readonly sections = signal<string[]>([...SERIES_SECTION_LABELS]);

  readonly accent = computed(() => this.seriesCtx.config().accent);

  onSeriesChange(id: string): void {
    const seriesId = id as 'f1' | 'f2' | 'f3';
    if (seriesId === this.seriesCtx.id()) return;
    void this.router.navigateByUrl(homePathForSeries(seriesId));
  }
}
