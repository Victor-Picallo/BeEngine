import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { CountdownTime, NextRace, padTwo } from '../../../data/sports.data';

@Component({
  selector: 'app-race-card',
  templateUrl: './race-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle],
})
export class RaceCardComponent {
  nextRace  = input.required<NextRace>();
  accent    = input.required<string>();
  countdown = input.required<CountdownTime>();

  countdownUnits = computed(() => {
    const t = this.countdown();
    return [
      { label: 'días',  val: t.d },
      { label: 'horas', val: t.h },
      { label: 'min',   val: t.m },
      { label: 'seg',   val: t.s },
    ];
  });

  pad = padTwo;
}
