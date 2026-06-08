import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { MotogpPulseService } from '../motogp/motogp-pulse.service';
import { resolveMotogpLiveRoute } from './motogp-live-route.util';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';

/** Entrada `/motogp/live` → sesión Pulse Live activa en el calendario. */
@Component({
  selector: 'app-motogp-live-hub-page',
  standalone: true,
  imports: [AppHeaderComponent, RouterLink],
  template: `
    <app-header></app-header>
    <div class="motogp-live-hub">
      @if (error()) {
        <p>{{ error() }}</p>
        <a routerLink="/motogp/calendario">Ir al calendario</a>
      } @else {
        <p>Conectando con la sesión en directo…</p>
      }
    </div>
  `,
  styles: `
    .motogp-live-hub {
      padding: 2rem;
      text-align: center;
      color: #444;
    }
    .motogp-live-hub a {
      color: #0052cc;
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotogpLiveHubPageComponent implements OnInit {
  private readonly motogp = inject(MotogpPulseService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  error = signal<string | null>(null);

  ngOnInit(): void {
    forkJoin({
      cal: this.motogp.getCalendar().pipe(catchError(() => of([]))),
      live: this.motogp.getLiveTiming().pipe(
        catchError(() =>
          of({ active: false, categoryId: 'motogp', head: null, riders: [] }),
        ),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ cal, live }) => {
        const target = resolveMotogpLiveRoute(cal, live);
        if (target) {
          void this.router.navigate(target, { replaceUrl: true });
          return;
        }
        this.error.set('No hay un gran premio activo en el calendario.');
      });
  }
}
