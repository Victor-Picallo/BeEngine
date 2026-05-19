import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ReturnNavDirective } from '../../core/directives/return-nav.directive';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { F1LiveService } from '../f1-live/f1-live.service';
import type {
  JolpikaCalendarRace,
  JolpikaConstructorStanding,
  JolpikaDriverStanding,
  JolpikaLastRace,
  JolpikaRaceResult,
  OpenF1Driver,
} from '../f1-live/f1-live.types';
import { ACCENT } from '../drivers/drivers-shared';
import {
  buildConstructorRows,
  buildDriverRows,
  ClConstructorRow,
  ClDriverRow,
  seasonProgress,
  sparklineLastDot,
  sparklinePoints,
} from './clasificacion-build';

@Component({
  selector: 'app-f1-clasificacion-page',
  standalone: true,
  imports: [AppHeaderComponent, AppSidebarComponent, RouterLink, ReturnNavDirective],
  templateUrl: './f1-clasificacion.page.html',
  styleUrls: ['./f1-clasificacion.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class F1ClasificacionPageComponent implements OnInit {
  private readonly f1 = inject(F1LiveService);
  private readonly destroyRef = inject(DestroyRef);

  readonly accent = ACCENT;

  loading = signal(true);
  error = signal<string | null>(null);
  view = signal<'drivers' | 'constructors'>('drivers');
  private failedConstImg = signal(new Set<string>());

  private driverStands = signal<JolpikaDriverStanding[]>([]);
  private teamStands = signal<JolpikaConstructorStanding[]>([]);
  private openf1 = signal<OpenF1Driver[]>([]);
  private races = signal<JolpikaRaceResult[]>([]);
  private calendar = signal<JolpikaCalendarRace[]>([]);
  private lastRace = signal<JolpikaLastRace | null>(null);

  driverRows = computed(() =>
    buildDriverRows(this.driverStands(), this.openf1(), this.races()),
  );

  constructorRows = computed(() =>
    buildConstructorRows(this.teamStands(), this.driverStands()),
  );

  leader = computed(() => this.driverRows()[0] ?? null);

  constructorLeader = computed(() => this.constructorRows()[0] ?? null);

  season = computed(() => seasonProgress(this.calendar(), this.lastRace()));

  legendLastGp = computed(() => {
    const lr = this.lastRace();
    if (!lr) return '';
    return `Ronda ${lr.round} de ${this.season().total} · ${lr.raceName} fue la última carrera`;
  });

  ngOnInit(): void {
    forkJoin({
      drivers: this.f1.getDriverStandings().pipe(catchError(() => of([] as JolpikaDriverStanding[]))),
      teams: this.f1.getConstructorStandings().pipe(
        catchError(() => of([] as JolpikaConstructorStanding[])),
      ),
      calendar: this.f1.getCalendar().pipe(catchError(() => of([] as JolpikaCalendarRace[]))),
      openf1: this.f1.getDrivers('latest').pipe(catchError(() => of([] as OpenF1Driver[]))),
      lastRace: this.f1.getLastRace().pipe(catchError(() => of(null as JolpikaLastRace | null))),
    })
      .pipe(
        switchMap(base => {
          const rounds = base.lastRace?.round
            ? Array.from({ length: base.lastRace.round }, (_, i) => i + 1)
            : [];
          if (!rounds.length) {
            return of({ ...base, races: [] as JolpikaRaceResult[] });
          }
          return forkJoin(
            rounds.map(r =>
              this.f1.getRaceResults(r).pipe(catchError(() => of(null as JolpikaRaceResult | null))),
            ),
          ).pipe(
            map(mapResults => ({
              ...base,
              races: mapResults.filter((r): r is JolpikaRaceResult => r != null),
            })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: res => {
          this.driverStands.set(res.drivers);
          this.teamStands.set(res.teams);
          this.calendar.set(res.calendar);
          this.openf1.set(res.openf1);
          this.lastRace.set(res.lastRace);
          this.races.set(res.races);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar la clasificación.');
          this.loading.set(false);
        },
      });
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

  constructorLeaderDisplayName(c: ClConstructorRow): string {
    return c.team.toUpperCase();
  }

  imgError(ev: Event): void {
    const el = ev.target;
    if (el instanceof HTMLImageElement) el.style.display = 'none';
  }

  constImgKey(c: ClConstructorRow): string {
    return c.constructorId ?? c.team;
  }

  constCarImage(c: ClConstructorRow): string | null {
    const key = this.constImgKey(c);
    if (this.failedConstImg().has(key)) return null;
    return c.carImageUrl ?? c.logoImageUrl;
  }

  constCarImgError(c: ClConstructorRow): void {
    const key = this.constImgKey(c);
    this.failedConstImg.update(s => new Set(s).add(key));
  }

  seasonDots(): number[] {
    return Array.from({ length: this.season().total }, (_, i) => i);
  }
}
