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
import { F1LiveService } from './f1-live.service';
import { resolveF1LiveRoute } from './f1-openf1-session.util';

/** Redirige `/f1/live` → `/f1/calendario/:gp/:session` con sesión OpenF1 resuelta. */
@Component({
  selector: 'app-f1-live-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="f1-live-redirect">
      @if (error()) {
        <p class="f1-live-redirect__err">{{ error() }}</p>
        <a routerLink="/f1/calendario">Ir al calendario</a>
      } @else {
        <p class="f1-live-redirect__msg">Cargando directo F1…</p>
      }
    </div>
  `,
  styles: [
    `
      .f1-live-redirect {
        min-height: 40vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        font-family: 'Barlow', sans-serif;
        color: #555;
      }
      .f1-live-redirect__msg {
        margin: 0;
        font-size: 15px;
      }
      .f1-live-redirect__err {
        margin: 0;
        font-size: 14px;
        color: #c00;
        max-width: 320px;
        text-align: center;
      }
      .f1-live-redirect a {
        color: #0052cc;
        font-weight: 600;
        text-decoration: none;
      }
      .f1-live-redirect a:hover {
        text-decoration: underline;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class F1LivePageComponent implements OnInit {
  private readonly service = inject(F1LiveService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    forkJoin({
      calendar: this.service.getCalendar().pipe(catchError(() => of([]))),
      sessions: this.service.getSessions().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ calendar, sessions }) => {
        const target = resolveF1LiveRoute(calendar, sessions);
        if (target) {
          void this.router.navigate(target, { replaceUrl: true });
          return;
        }
        this.error.set('No se pudo localizar el Gran Premio en curso.');
      });
  }
}
