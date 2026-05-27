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
  CALENDAR_CARD_CIRCUIT_FIT,
  type CircuitSvgModel,
} from '../../shared/utils/circuit-svg.util';
import {
  fetchCircuitPathFromSvgUrl,
  pickCircuitSvgUrl,
} from '../../shared/utils/circuit-path-from-svg.util';

const FALLBACK = buildCircuitSvgForRace({});

/**
 * Mapa de circuito para cards F1/F2/F3: extrae el path del SVG en DB,
 * lo escala a un viewBox fijo y dibuja con stroke-width uniforme (sin <img>).
 */
@Component({
  selector: 'app-formula-circuit-card-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="fc-circuit-svg fc-circuit-svg--formula-outline"
      [attr.viewBox]="svg().viewBox"
      preserveAspectRatio="xMidYMid meet"
      [attr.aria-label]="alt()"
      role="img"
    >
      <path class="fc-circuit-glow" fill="none" [attr.d]="svg().circuitPath"></path>
      <path class="fc-circuit-asphalt" fill="none" [attr.d]="svg().circuitPath"></path>
      <path class="fc-circuit-line" fill="none" [attr.d]="svg().circuitPath"></path>
      <path class="fc-circuit-dash" fill="none" [attr.d]="svg().circuitPath"></path>
      <circle class="fc-start-outer" [attr.cx]="svg().startX" [attr.cy]="svg().startY" r="5.5"></circle>
      <circle class="fc-start-inner" [attr.cx]="svg().startX" [attr.cy]="svg().startY" r="2.8"></circle>
    </svg>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .fc-circuit-svg--formula-outline {
        width: 100%;
        height: 100%;
        display: block;
      }
      .fc-circuit-glow {
        fill: none;
        stroke: #555;
        stroke-width: 9;
        stroke-linejoin: round;
        stroke-linecap: round;
        opacity: 0.08;
      }
      .fc-circuit-asphalt {
        fill: none;
        stroke: #2a2a2a;
        stroke-width: 6;
        stroke-linejoin: round;
        stroke-linecap: round;
      }
      .fc-circuit-line {
        fill: none;
        stroke: #ececec;
        stroke-width: 2.5;
        stroke-linejoin: round;
        stroke-linecap: round;
        opacity: 0.92;
        filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.14));
      }
      .fc-circuit-dash {
        fill: none;
        stroke: rgba(255, 255, 255, 0.1);
        stroke-width: 0.7;
        stroke-linejoin: round;
        stroke-linecap: round;
        stroke-dasharray: 5 8;
      }
      .fc-start-outer {
        fill: #666;
        opacity: 0.9;
      }
      .fc-start-inner {
        fill: #fff;
        opacity: 0.65;
      }
      :host-context(.fc-card.next) .fc-circuit-glow {
        stroke: var(--accent, #e10600);
        opacity: 0.14;
      }
      :host-context(.fc-card.next) .fc-circuit-line {
        stroke: var(--accent, #e10600);
        opacity: 0.95;
        filter: drop-shadow(0 0 10px color-mix(in srgb, var(--accent, #e10600) 40%, transparent));
      }
      :host-context(.fc-card.next) .fc-start-outer {
        fill: var(--accent, #e10600);
      }
      :host-context(.fc-card.next) .fc-start-inner {
        opacity: 1;
      }
    `,
  ],
})
export class FormulaCircuitCardMapComponent {
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

      const svgUrl = pickCircuitSvgUrl(race.circuitSvgUrl, race.circuitImageUrl);
      if (!svgUrl) {
        untracked(() => this.svg.set(buildCircuitSvgForRace(race)));
        return;
      }

      untracked(() => {
        void fetchCircuitPathFromSvgUrl(svgUrl).then((points) => {
          if (cancelled) return;
          if (points && points.length >= 30) {
            this.svg.set(buildCircuitSvgFromFlatPoints(points, CALENDAR_CARD_CIRCUIT_FIT));
            return;
          }
          this.svg.set(buildCircuitSvgForRace(race));
        });
      });
    });
  }
}
