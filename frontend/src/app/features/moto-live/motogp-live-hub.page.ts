import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { F1LiveService } from '../f1-live/f1-live.service';
import { slugifyRace } from '../race/race-slug';
import { pulseLiveSessionKeyFromShort } from './moto-live-session-key';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';

/**
 * Entrada “MotoGP Live”: lleva al GP y sesión activos (livetiming o próxima carrera).
 */
@Component({
  selector: 'app-motogp-live-hub-page',
  standalone: true,
  imports: [AppHeaderComponent],
  template: `
    <app-header></app-header>
    <div class="motogp-live-hub">
      @if (error()) {
        <p>{{ error() }}</p>
        <a href="/motogp/calendario">Ir al calendario</a>
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotogpLiveHubPageComponent implements OnInit {
  private readonly service = inject(F1LiveService);
  private readonly router = inject(Router);

  error = signal<string | null>(null);

  ngOnInit(): void {
    forkJoin({
      cal: this.service.getCalendar('motogp'),
      live: this.service.getLiveTiming('motogp').pipe(
        catchError(() =>
          of({ active: false, categoryId: 'motogp', head: null, riders: [] }),
        ),
      ),
    }).subscribe({
      next: ({ cal, live }) => {
        let round = cal.length;
        let sessionKey = 'race';

        if (live.active && live.head) {
          sessionKey = pulseLiveSessionKeyFromShort(live.head.sessionShortName);
          const match = cal.find(
            (r) =>
              r.circuitName.toLowerCase().includes(live.head!.circuitName.toLowerCase()) ||
              live.head!.circuitName.toLowerCase().includes(r.circuitName.toLowerCase()),
          );
          if (match) round = match.round;
        } else {
          const upcoming = cal.find((r) => {
            const t = new Date(`${r.date}T${r.time ?? '12:00:00Z'}`);
            return Number.isFinite(t.getTime()) && t >= new Date();
          });
          if (upcoming) round = upcoming.round;
        }

        const race = cal.find((r) => r.round === round);
        if (!race) {
          this.error.set('No hay un gran premio activo en el calendario.');
          return;
        }

        void this.router.navigate(['/motogp', 'calendario', slugifyRace(race), sessionKey]);
      },
      error: () => this.error.set('No se pudo conectar con MotoGP Live.'),
    });
  }
}
