import { ChangeDetectionStrategy, Component, input } from '@angular/core';
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
}
