import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReturnNavDirective } from '../../../core/directives/return-nav.directive';
import { Category, Favorite } from '../../../data/sports.data';
import { SeriesContextService } from '../../../core/series/series-context.service';
import { seriesSectionPath } from '../../f1-sidebar-sections';

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

  sectionPath(label: string): string | null {
    return seriesSectionPath(this.seriesCtx.id(), label);
  }

  pilotosLink(fav: Favorite): (string | number)[] | null {
    if (!fav.driverId) return null;
    return this.seriesCtx.path('pilotos', fav.driverId);
  }

  catChange = output<string>();
}
