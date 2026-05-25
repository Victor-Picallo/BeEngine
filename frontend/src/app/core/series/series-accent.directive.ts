import { Directive, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SeriesContextService } from './series-context.service';
import { MotoContextService } from '../moto/moto-context.service';
import { isMotoAppRoute } from '../moto/moto-categories';
import { accentForeground } from './series-accent.utils';

/** Propaga variables CSS de acento según la serie activa (F1/F2/F3/MotoGP/Moto2/Moto3). */
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
  private readonly moto = inject(MotoContextService);
  private readonly router = inject(Router);

  get accent(): string {
    if (isMotoAppRoute(this.router.url)) {
      return this.moto.config().accent;
    }
    return this.series.config().accent;
  }

  get accentFg(): string {
    return accentForeground(this.accent);
  }
}
