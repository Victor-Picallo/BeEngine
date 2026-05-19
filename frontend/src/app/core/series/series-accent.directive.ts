import { Directive, inject } from '@angular/core';
import { SeriesContextService } from './series-context.service';
import { accentForeground } from './series-accent.utils';

/** Propaga variables CSS de acento según la serie activa (F1/F2/F3). */
@Directive({
  selector: '.fc-root, .cl-page',
  standalone: true,
  host: {
    '[style.--accent]': 'accent',
    '[style.--cl-accent]': 'accent',
    '[style.--hm-accent]': 'accent',
    '[style.--accent-fg]': 'accentFg',
  },
})
export class SeriesAccentDirective {
  private readonly series = inject(SeriesContextService);

  get accent(): string {
    return this.series.config().accent;
  }

  get accentFg(): string {
    return accentForeground(this.accent);
  }
}
