import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-news-image',
  standalone: true,
  template: `
    <div class="nw-img" [class.nw-img--featured]="featured()" [style.height.px]="height()">
      @if (src() && !imgFailed()) {
        <img
          class="nw-img-photo"
          [src]="src()!"
          [alt]="alt()"
          loading="lazy"
          (error)="imgFailed.set(true)"
        />
      } @else {
        <div class="nw-img-placeholder" [style.--nw-accent]="accent()">
          <svg class="nw-img-grid" width="100%" height="100%" aria-hidden="true">
            <defs>
              <pattern [attr.id]="patternId" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" [attr.stroke]="accent()" stroke-width="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" [attr.fill]="'url(#' + patternId + ')'" />
          </svg>
          <div class="nw-img-glow"></div>
          <svg class="nw-img-icon" [attr.width]="iconSize()" [attr.height]="iconSize()" viewBox="0 0 80 80" aria-hidden="true">
            @switch (shape()) {
              @case ('moto') {
                <path
                  d="M18,52 A10,10 0 1,0 18.01,52 M62,52 A10,10 0 1,0 62.01,52 M18,44 L26,28 L36,28 L42,36 L52,30 L62,30 L62,44"
                  [attr.stroke]="accent()"
                  stroke-width="4"
                  fill="none"
                  stroke-linecap="round"
                />
              }
              @case ('bolt') {
                <path d="M46,12 L30,42 L44,42 L34,68 L54,34 L40,34Z" [attr.fill]="accent()" />
              }
              @case ('rally') {
                <path
                  d="M8,50 L8,34 L16,24 L36,22 L50,28 L64,26 L72,34 L72,50 L64,54 L56,48 L24,48 L16,54Z M18,54 A8,8 0 1,0 18.01,54 M58,54 A8,8 0 1,0 58.01,54"
                  [attr.fill]="accent()"
                />
              }
              @case ('oval') {
                <ellipse cx="40" cy="46" rx="28" ry="12" [attr.stroke]="accent()" stroke-width="4" fill="none" />
              }
              @default {
                <path
                  d="M10,52 L14,38 L22,34 L28,28 L52,28 L58,34 L66,38 L70,52 L62,54 L58,48 L22,48 L18,54Z M20,54 A6,6 0 1,0 20.01,54 M60,54 A6,6 0 1,0 60.01,54"
                  [attr.fill]="accent()"
                />
              }
            }
          </svg>
          <span class="nw-img-cat">{{ catLabel() }}</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .nw-img {
        width: 100%;
        position: relative;
        overflow: hidden;
        flex-shrink: 0;
        border-radius: 6px 6px 0 0;
        background: #111;
      }
      .nw-img--featured {
        border-radius: 8px 8px 0 0;
      }
      .nw-img-photo {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        display: block;
      }
      .nw-img-placeholder {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, color-mix(in srgb, var(--nw-accent, #ffd100) 8%, #111) 0%, #111 100%);
      }
      .nw-img-grid {
        position: absolute;
        inset: 0;
        opacity: 0.06;
      }
      .nw-img-glow {
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at 30% 50%, color-mix(in srgb, var(--nw-accent) 13%, transparent) 0%, transparent 70%);
      }
      .nw-img-icon {
        position: relative;
        opacity: 0.35;
      }
      .nw-img-cat {
        position: absolute;
        bottom: 8px;
        right: 8px;
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 700;
        font-size: 10px;
        color: var(--nw-accent);
        letter-spacing: 1.5px;
        text-transform: uppercase;
        opacity: 0.7;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsImageComponent {
  readonly cat = input.required<string>();
  readonly src = input<string | null>(null);
  readonly alt = input('');
  readonly featured = input(false);
  readonly height = input(180);
  readonly accent = input('#FFD100');

  readonly imgFailed = signal(false);
  readonly patternId = `nw-grid-${Math.random().toString(36).slice(2, 9)}`;

  iconSize(): number {
    return this.featured() ? 80 : 52;
  }

  catLabel(): string {
    return this.cat().toUpperCase();
  }

  shape(): 'car' | 'moto' | 'bolt' | 'rally' | 'oval' {
    const map: Record<string, 'car' | 'moto' | 'bolt' | 'rally' | 'oval'> = {
      f1: 'car',
      motogp: 'moto',
      fe: 'bolt',
      wrc: 'rally',
      indycar: 'oval',
    };
    return map[this.cat()] ?? 'car';
  }
}
