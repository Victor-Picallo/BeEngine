import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { buildCircuitSvg } from '../../utils/circuit-svg.util';

@Component({
  selector: 'app-home-circuit-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (circuitSvgUrl()) {
      <img class="hm-circuit-svg hm-circuit-svg--img" [src]="circuitSvgUrl()!" [alt]="circuitName()" loading="lazy" />
    } @else {
      <svg class="hm-circuit-svg" [attr.viewBox]="svg().viewBox" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path class="hm-circuit-shadow" [attr.d]="svg().circuitPath" />
        <path class="hm-circuit-track" [attr.d]="svg().circuitPath" />
        <path class="hm-circuit-line" [attr.d]="svg().circuitPath" [attr.stroke]="accent()" />
        <circle class="hm-circuit-start" [attr.cx]="svg().startX" [attr.cy]="svg().startY" r="5.5" [attr.fill]="accent()" />
        <circle class="hm-circuit-start-inner" [attr.cx]="svg().startX" [attr.cy]="svg().startY" r="3" fill="#fff" opacity="0.9" />
      </svg>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .hm-circuit-svg {
        width: 100%;
        height: 100%;
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
        width: 100%;
        height: 100%;
        object-fit: contain;
        filter: drop-shadow(0 0 10px rgba(0, 82, 204, 0.2));
      }
    `,
  ],
})
export class HomeCircuitPreviewComponent {
  circuitName = input('');
  locality = input('');
  accent = input('#FFD100');
  /** Si viene de Pulse Live, se muestra el SVG oficial en lugar del mapa F1. */
  circuitSvgUrl = input<string | null>(null);

  svg = computed(() => buildCircuitSvg(this.circuitName(), this.locality()));
}
