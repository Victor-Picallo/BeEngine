import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CountdownTime, NextRace, padTwo } from '../../../data/sports.data';
import { HomeCircuitPreviewComponent } from '../home-circuit-preview/home-circuit-preview.component';

@Component({
  selector: 'app-race-card',
  templateUrl: './race-card.component.html',
  styleUrl: './race-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HomeCircuitPreviewComponent],
})
export class RaceCardComponent {
  nextRace = input.required<NextRace>();
  accent = input.required<string>();
  countdown = input.required<CountdownTime>();
  /** Trazado blanco estilo calendario (F1/F2/F3). */
  formulaOutline = input(false);

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
