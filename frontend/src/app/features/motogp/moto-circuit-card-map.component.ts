import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  signal,
  untracked,
} from '@angular/core';
import type { JolpikaCalendarRace } from '../f1-live/f1-live.types';
import {
  buildCircuitSvgForRace,
  buildCircuitSvgFromFlatPoints,
  type CircuitSvgModel,
} from '../../shared/utils/circuit-svg.util';
import {
  fetchCircuitPathFromSvgUrl,
  pickCircuitSvgUrl,
} from '../../shared/utils/circuit-path-from-svg.util';

const FALLBACK = buildCircuitSvgForRace({});

/**
 * Mapa de circuito para cards Moto: mismo trazado que la página en vivo
 * (SVG del race.circuitSvgUrl) y GPS solo si no hay SVG.
 */
@Component({
  selector: 'app-moto-circuit-card-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="fc-circuit-svg fc-circuit-svg--moto-outline"
      [attr.viewBox]="svg().viewBox"
      preserveAspectRatio="xMidYMid meet"
      [attr.aria-label]="alt()"
      role="img"
    >
      <path class="moto-circuit-glow" [attr.d]="svg().circuitPath"></path>
      <path class="moto-circuit-asphalt" [attr.d]="svg().circuitPath"></path>
      <path class="moto-circuit-line" [attr.d]="svg().circuitPath"></path>
    </svg>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .fc-circuit-svg--moto-outline {
        width: 100%;
        height: 100%;
        display: block;
      }
      .moto-circuit-glow {
        fill: none;
        stroke: #555;
        stroke-width: 9;
        stroke-linejoin: round;
        stroke-linecap: round;
        opacity: 0.1;
      }
      .moto-circuit-asphalt {
        fill: none;
        stroke: #1a1a1a;
        stroke-width: 6;
        stroke-linejoin: round;
        stroke-linecap: round;
      }
      .moto-circuit-line {
        fill: none;
        stroke: #ececec;
        stroke-width: 2.5;
        stroke-linejoin: round;
        stroke-linecap: round;
        opacity: 0.92;
        filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.14));
      }
    `,
  ],
})
export class MotoCircuitCardMapComponent {
  race = input.required<JolpikaCalendarRace>();
  alt = input('Circuit map');

  svg = signal<CircuitSvgModel>(FALLBACK);

  constructor() {
    effect((onCleanup) => {
      const race = this.race();
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      const svgUrl = pickCircuitSvgUrl(race.circuitSvgUrl);
      if (!svgUrl) {
        untracked(() => this.svg.set(buildCircuitSvgForRace(race)));
        return;
      }

      untracked(() => {
        void fetchCircuitPathFromSvgUrl(svgUrl).then((points) => {
          if (cancelled) return;
          if (points && points.length >= 30) {
            this.svg.set(buildCircuitSvgFromFlatPoints(points));
            return;
          }
          this.svg.set(buildCircuitSvgForRace(race));
        });
      });
    });
  }
}
