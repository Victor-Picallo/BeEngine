import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { DataSource } from '../../../core/data-source';

@Component({
  selector: 'app-data-source-badge',
  standalone: true,
  template: `
    @if (source() === 'db') {
      <span
        class="ds-badge"
        title="APIs en vivo no disponibles; mostrando datos guardados en base de datos"
        >Datos en caché</span
      >
    }
  `,
  styles: [
    `
      .ds-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #e8d9a8;
        background: rgba(200, 150, 62, 0.2);
        border: 1px solid rgba(200, 150, 62, 0.45);
        vertical-align: middle;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataSourceBadgeComponent {
  source = input<DataSource | null>(null);
}
