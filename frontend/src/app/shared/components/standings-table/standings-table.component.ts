import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { Driver, FLAG_MAP } from '../../../data/sports.data';

@Component({
  selector: 'app-standings-table',
  templateUrl: './standings-table.component.html',
  styleUrl: './standings-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle],
})
export class StandingsTableComponent {
  standings = input.required<Driver[]>();
  accent    = input.required<string>();

  readonly flagMap = FLAG_MAP;

  showAll = signal(false);

  visibleDrivers = computed(() =>
    this.showAll() ? this.standings() : this.standings().slice(0, 5)
  );

  toggleShowAll(): void {
    this.showAll.update(v => !v);
  }
}
