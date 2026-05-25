import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReturnNavDirective } from '../../../core/directives/return-nav.directive';
import { Category, Favorite } from '../../../data/sports.data';
import { SeriesContextService } from '../../../core/series/series-context.service';
import { seriesSectionPath } from '../../../core/series/series-sidebar';
import type { SeriesId } from '../../../core/series/series.types';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle, RouterLink, ReturnNavDirective],
})
export class SidebarComponent {
  private readonly seriesCtx = inject(SeriesContextService);

  categories = input.required<Category[]>();
  activeCat  = input.required<string>();
  accent     = input.required<string>();
  favorites  = input.required<Favorite[]>();
  sections   = input.required<string[]>();
  /** Serie activa para enlaces (p. ej. `moto2` en noticias moto con `?cat=moto2`). */
  sectionSeriesId = input<SeriesId | null>(null);

  private activeSeriesId(): SeriesId {
    return this.sectionSeriesId() ?? this.seriesCtx.id();
  }

  sectionPath(label: string): string | null {
    return seriesSectionPath(this.activeSeriesId(), label);
  }

  pilotosLink(fav: Favorite): (string | number)[] | null {
    if (!fav.driverId) return null;
    const sid = this.activeSeriesId();
    if (sid === 'f1') return this.seriesCtx.path('pilotos', fav.driverId);
    return [`/${sid}`, 'pilotos', fav.driverId];
  }

  catChange = output<string>();
}
