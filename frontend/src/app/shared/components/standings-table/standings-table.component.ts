import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReturnNavDirective } from '../../../core/directives/return-nav.directive';
import { SeriesContextService } from '../../../core/series/series-context.service';
import { Driver, FLAG_MAP } from '../../../data/sports.data';

@Component({
  selector: 'app-standings-table',
  templateUrl: './standings-table.component.html',
  styleUrl: './standings-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle, RouterLink, ReturnNavDirective],
})
export class StandingsTableComponent {
  readonly seriesCtx = inject(SeriesContextService);

  standings = input.required<Driver[]>();
  accent = input.required<string>();
  title = input('Clasificación Pilotos');
  showFooter = input(true);

  readonly flagMap = FLAG_MAP;
}
