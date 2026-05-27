import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
  untracked,
} from '@angular/core';
import {
  buildCircuitSvg,
  buildCircuitSvgFromFlatPoints,
  CALENDAR_CARD_CIRCUIT_FIT,
  type CircuitSvgModel,
} from '../../utils/circuit-svg.util';
import {
  fetchCircuitPathFromSvgUrl,
  pickCircuitSvgUrl,
} from '../../utils/circuit-path-from-svg.util';

const FALLBACK = buildCircuitSvg('', '');

/**
 * Vista previa del circuito en la card «Próxima carrera» del home.
 * Con `formulaOutline`, mismo trazado blanco que las cards del calendario F1/F2/F3.
 */
@Component({
  selector: 'app-home-circuit-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (formulaOutline()) {
      <svg
        class="hm-circuit-svg hm-circuit-svg--formula"
        [attr.viewBox]="svgModel().viewBox"
        preserveAspectRatio="xMidYMid meet"
        [attr.aria-label]="circuitName()"
        role="img"
      >
        <path class="hm-fc-glow" fill="none" [attr.d]="svgModel().circuitPath"></path>
        <path class="hm-fc-asphalt" fill="none" [attr.d]="svgModel().circuitPath"></path>
        <path class="hm-fc-line" fill="none" [attr.d]="svgModel().circuitPath"></path>
        <path class="hm-fc-dash" fill="none" [attr.d]="svgModel().circuitPath"></path>
        <circle class="hm-fc-start-outer" [attr.cx]="svgModel().startX" [attr.cy]="svgModel().startY" r="5.5"></circle>
        <circle class="hm-fc-start-inner" [attr.cx]="svgModel().startX" [attr.cy]="svgModel().startY" r="2.8"></circle>
      </svg>
    } @else if (displayUrl()) {
      <img
        class="hm-circuit-svg hm-circuit-svg--img"
        [src]="displayUrl()!"
        [alt]="circuitName()"
        loading="lazy"
        (error)="onImgError()"
      />
    } @else {
      <svg class="hm-circuit-svg" [attr.viewBox]="legacySvg().viewBox" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path class="hm-circuit-shadow" [attr.d]="legacySvg().circuitPath" />
        <path class="hm-circuit-track" [attr.d]="legacySvg().circuitPath" />
        <path class="hm-circuit-line" [attr.d]="legacySvg().circuitPath" [attr.stroke]="accent()" />
        <circle class="hm-circuit-start" [attr.cx]="legacySvg().startX" [attr.cy]="legacySvg().startY" r="5.5" [attr.fill]="accent()" />
        <circle class="hm-circuit-start-inner" [attr.cx]="legacySvg().startX" [attr.cy]="legacySvg().startY" r="3" fill="#fff" opacity="0.9" />
      </svg>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        --hm-accent: #ffd100;
      }
      .hm-circuit-svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      .hm-fc-glow {
        fill: none;
        stroke: var(--hm-accent);
        stroke-width: 9;
        stroke-linejoin: round;
        stroke-linecap: round;
        opacity: 0.14;
      }
      .hm-fc-asphalt {
        fill: none;
        stroke: #2a2a2a;
        stroke-width: 6;
        stroke-linejoin: round;
        stroke-linecap: round;
      }
      .hm-fc-line {
        fill: none;
        stroke: var(--hm-accent);
        stroke-width: 2.5;
        stroke-linejoin: round;
        stroke-linecap: round;
        opacity: 0.95;
        filter: drop-shadow(0 0 8px color-mix(in srgb, var(--hm-accent) 40%, transparent));
      }
      .hm-fc-dash {
        fill: none;
        stroke: rgba(255, 255, 255, 0.1);
        stroke-width: 0.7;
        stroke-linejoin: round;
        stroke-linecap: round;
        stroke-dasharray: 5 8;
      }
      .hm-fc-start-outer {
        fill: var(--hm-accent);
        opacity: 0.9;
      }
      .hm-fc-start-inner {
        fill: #fff;
        opacity: 0.65;
      }
      .hm-circuit-shadow {
        fill: none;
        stroke: currentColor;
        stroke-width: 9;
        opacity: 0.06;
        stroke-linejoin: round;
        stroke-linecap: round;
      }
      .hm-circuit-track {
        fill: none;
        stroke: #111;
        stroke-width: 5.5;
        stroke-linejoin: round;
        stroke-linecap: round;
      }
      .hm-circuit-line {
        fill: none;
        stroke-width: 2.8;
        opacity: 0.85;
        stroke-linejoin: round;
        stroke-linecap: round;
      }
      .hm-circuit-svg--img {
        object-fit: contain;
        filter: drop-shadow(0 0 10px rgba(0, 82, 204, 0.2));
      }
    `,
  ],
  host: {
    '[style.--hm-accent]': 'accent()',
  },
})
export class HomeCircuitPreviewComponent {
  circuitName = input('');
  locality = input('');
  accent = input('#FFD100');
  circuitSvgUrl = input<string | null>(null);
  circuitImageUrl = input<string | null>(null);
  /** F1/F2/F3: trazado blanco desde SVG en DB (como calendario), sin <img> a color. */
  formulaOutline = input(false);

  private svgFailed = signal(false);
  svgModel = signal<CircuitSvgModel>(FALLBACK);

  legacySvg = computed(() => buildCircuitSvg(this.circuitName(), this.locality()));

  displayUrl = computed(() => {
    if (this.formulaOutline()) return null;
    const svg = this.circuitSvgUrl();
    const png = this.circuitImageUrl();
    if (svg && !this.svgFailed()) return svg;
    return png || null;
  });

  constructor() {
    effect((onCleanup) => {
      if (!this.formulaOutline()) return;

      const svgUrl = pickCircuitSvgUrl(this.circuitSvgUrl(), this.circuitImageUrl());
      const name = this.circuitName();
      const loc = this.locality();
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      if (!svgUrl) {
        untracked(() => this.svgModel.set(buildCircuitSvg(name, loc)));
        return;
      }

      untracked(() => {
        void fetchCircuitPathFromSvgUrl(svgUrl).then((points) => {
          if (cancelled) return;
          if (points && points.length >= 30) {
            this.svgModel.set(buildCircuitSvgFromFlatPoints(points, CALENDAR_CARD_CIRCUIT_FIT));
            return;
          }
          this.svgModel.set(buildCircuitSvg(name, loc));
        });
      });
    });

    effect(() => {
      this.circuitSvgUrl();
      this.formulaOutline();
      this.svgFailed.set(false);
    });
  }

  onImgError(): void {
    if (this.circuitSvgUrl() && !this.svgFailed()) {
      this.svgFailed.set(true);
    }
  }
}
