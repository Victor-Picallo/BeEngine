import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { Driver, NewsItem, NextRace } from '../../../data/sports.data';

@Component({
  selector: 'app-right-rail',
  templateUrl: './right-rail.component.html',
  styleUrl: './right-rail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle],
})
export class RightRailComponent {
  nextRace  = input.required<NextRace>();
  standings = input.required<Driver[]>();
  news      = input.required<NewsItem[]>();
  activeCat = input.required<string>();

  quickStats = computed(() => {
    const r = this.nextRace();
    const s = this.standings();
    return [
      { label: 'Rondas completadas', val: `${r.round - 1}/${r.totalRounds}` },
      { label: 'Líder mundial',      val: s[0].driver },
      { label: 'Diferencia 1º-2º',  val: `${s[0].points - s[1].points} pts` },
      { label: 'Constructor líder', val: this.activeCat() === 'motogp' ? 'Ducati' : 'Ferrari' },
    ];
  });

  trendingNews = computed(() => this.news().slice(0, 3));
}
