import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReturnNavDirective } from '../../core/directives/return-nav.directive';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MotogpPulseService } from './motogp-pulse.service';
import type {
  JolpikaCalendarRace,
  JolpikaDriverStanding,
  JolpikaLastRace,
  JolpikaRaceResult,
} from '../f1-live/f1-live.types';
import type { MotogpTeamStanding } from './motogp.types';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { SeriesAccentDirective } from '../../core/series/series-accent.directive';
import {
  buildDriverRows,
  ClDriverRow,
  seasonProgress,
  sparklineLastDot,
  sparklinePoints,
} from '../standings/clasificacion-build';
import {
  buildMotogpTeamRows,
  MotogpTeamClRow,
} from './motogp-clasificacion-build';
import { SeriesContextService } from '../../core/series/series-context.service';

@Component({
  selector: 'app-motogp-clasificacion-page',
  standalone: true,
  imports: [AppHeaderComponent, AppSidebarComponent, RouterLink, ReturnNavDirective, SeriesAccentDirective],
  templateUrl: './motogp-clasificacion.page.html',
  styleUrls: ['../standings/f1-clasificacion.page.css', '../drivers/driver-portrait.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotogpClasificacionPageComponent {
  private readonly motogp = inject(MotogpPulseService);
  private readonly destroyRef = inject(DestroyRef);
  readonly seriesCtx = inject(SeriesContextService);

  readonly homePath = computed(() => this.seriesCtx.homePath());
  readonly accent = computed(() => this.seriesCtx.config().accent);

  loading = signal(true);
  error = signal<string | null>(null);
  view = signal<'drivers' | 'constructors'>('drivers');
  private failedTeamImg = signal(new Set<string>());

  private driverStands = signal<JolpikaDriverStanding[]>([]);
  private teamStands = signal<MotogpTeamStanding[]>([]);
  private races = signal<JolpikaRaceResult[]>([]);
  private calendar = signal<JolpikaCalendarRace[]>([]);
  private lastRace = signal<JolpikaLastRace | null>(null);

  driverRows = computed(() =>
    buildDriverRows(this.driverStands(), [], this.races(), {
      headshotSize: 'card',
      seriesId: 'motogp',
    }),
  );

  teamRows = computed(() =>
    buildMotogpTeamRows(
      this.teamStands(),
      this.driverStands().map((d) => ({ team: d.team, driver: d.driver })),
    ),
  );

  leader = computed(() => this.driverRows()[0] ?? null);
  teamLeader = computed(() => this.teamRows()[0] ?? null);

  season = computed(() => seasonProgress(this.calendar(), this.lastRace()));

  legendLastGp = computed(() => {
    const lr = this.lastRace();
    if (!lr) return '';
    return `Ronda ${lr.round} de ${this.season().total} · ${lr.raceName} fue la última carrera`;
  });

  constructor() {
    this.fetchStandings();
  }

  private fetchStandings(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      drivers: this.motogp.getDriverStandings(true).pipe(
        catchError(() => of([] as JolpikaDriverStanding[])),
      ),
      teams: this.motogp.getOfficialTeamsGrid(true).pipe(
        catchError(() => of([] as MotogpTeamStanding[])),
      ),
      calendar: this.motogp.getCalendar().pipe(catchError(() => of([] as JolpikaCalendarRace[]))),
      lastRace: this.motogp.getLastRace().pipe(catchError(() => of(null as JolpikaLastRace | null))),
    })
      .pipe(
        switchMap((base) => {
          const rounds = base.lastRace?.round
            ? Array.from({ length: base.lastRace.round }, (_, i) => i + 1)
            : [];
          if (!rounds.length) {
            return of({ ...base, races: [] as JolpikaRaceResult[] });
          }
          return forkJoin(
            rounds.map((r) =>
              this.motogp.getRaceResults(r).pipe(catchError(() => of(null as JolpikaRaceResult | null))),
            ),
          ).pipe(
            map((mapResults) => ({
              ...base,
              races: mapResults.filter((r): r is JolpikaRaceResult => r != null),
            })),
          );
        }),
        tap((res) => {
          this.driverStands.set(res.drivers);
          this.teamStands.set(res.teams);
          this.calendar.set(res.calendar);
          this.lastRace.set(res.lastRace);
          this.races.set(res.races);
          this.loading.set(false);
        }),
        catchError(() => {
          this.error.set('No se pudo cargar la clasificación.');
          this.loading.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  setView(v: 'drivers' | 'constructors'): void {
    this.view.set(v);
  }

  rowDelay(index: number): number {
    return Math.min(index * 30, 300);
  }

  posColor(pos: number): string {
    if (pos === 1) return '#C8963E';
    if (pos === 2) return '#7A8A96';
    if (pos === 3) return '#8B5A2B';
    return '#bbb';
  }

  sparkPts(d: ClDriverRow): string {
    return sparklinePoints(d.cumPts);
  }

  sparkDot(d: ClDriverRow): { cx: number; cy: number } | null {
    return sparklineLastDot(d.cumPts);
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  leaderDisplayName(d: ClDriverRow): string {
    return `${d.first[0] ?? ''}. ${d.last}`;
  }

  teamLeaderDisplayName(c: MotogpTeamClRow): string {
    return c.team.toUpperCase();
  }

  imgError(ev: Event, row?: ClDriverRow): void {
    const el = ev.target;
    if (!(el instanceof HTMLImageElement)) return;
    el.style.display = 'none';
  }

  photoLoaded(ev: Event): void {
    const el = ev.target;
    if (!(el instanceof HTMLImageElement)) return;
    el.closest('.cl-photo-wrap')?.classList.add('cl-photo-loaded');
  }

  teamImgKey(c: MotogpTeamClRow): string {
    return c.constructorId ?? c.team;
  }

  teamLogoImage(c: MotogpTeamClRow): string | null {
    const key = this.teamImgKey(c);
    if (this.failedTeamImg().has(key)) return null;
    return c.logoImageUrl;
  }

  teamImgError(c: MotogpTeamClRow): void {
    this.failedTeamImg.update((s) => new Set(s).add(this.teamImgKey(c)));
  }

  seasonDots(): number[] {
    return Array.from({ length: this.season().total }, (_, i) => i);
  }
}
