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
import { bindSeriesLoad, isSeriesStillActive } from '../../core/series/bind-series-load';
import { isFeederSeries } from '../../core/series/series.config';
import type { SeriesId } from '../../core/series/series.types';
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
import { SeriesContextService } from '../../core/series/series-context.service';
import { SeriesAccentDirective } from '../../core/series/series-accent.directive';
import { resolveDriverHeadshotRawUrl } from '../drivers/drivers-shared';
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
  imports: [AppHeaderComponent, AppSidebarComponent, RouterLink, ReturnNavDirective, SeriesAccentDirective],
  templateUrl: './f1-clasificacion.page.html',
  styleUrls: ['./f1-clasificacion.page.css', '../drivers/driver-portrait.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class F1ClasificacionPageComponent {
  private readonly f1 = inject(F1LiveService);
  private readonly destroyRef = inject(DestroyRef);

  readonly seriesCtx = inject(SeriesContextService);
  readonly accent = computed(() => this.seriesCtx.config().accent);

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
    buildDriverRows(this.driverStands(), this.openf1(), this.races(), {
      headshotSize: isFeederSeries(this.seriesCtx.id()) ? 'large' : 'card',
      seriesId: this.seriesCtx.id(),
    }),
  );

  constructorRows = computed(() =>
    buildConstructorRows(this.teamStands(), this.driverStands(), {
      seriesId: this.seriesCtx.id(),
    }),
  );

  leader = computed(() => this.driverRows()[0] ?? null);

  constructorLeader = computed(() => this.constructorRows()[0] ?? null);

  season = computed(() => seasonProgress(this.calendar(), this.lastRace()));

  legendLastGp = computed(() => {
    const lr = this.lastRace();
    if (!lr) return '';
    return `Ronda ${lr.round} de ${this.season().total} · ${lr.raceName} fue la última carrera`;
  });

  constructor() {
    bindSeriesLoad((seriesId) => this.fetchStandings(seriesId), this.destroyRef);
  }

  private fetchStandings(seriesId: SeriesId) {
    this.loading.set(true);
    this.error.set(null);

    return forkJoin({
      drivers: this.f1.getDriverStandings(true, seriesId).pipe(
        catchError(() => of([] as JolpikaDriverStanding[])),
      ),
      teams: this.f1.getConstructorStandings(true, seriesId).pipe(
        catchError(() => of([] as JolpikaConstructorStanding[])),
      ),
      calendar: this.f1.getCalendar(seriesId).pipe(catchError(() => of([] as JolpikaCalendarRace[]))),
      openf1: this.f1.getDrivers('latest', seriesId).pipe(catchError(() => of([] as OpenF1Driver[]))),
      lastRace: this.f1.getLastRace(seriesId).pipe(catchError(() => of(null as JolpikaLastRace | null))),
    }).pipe(
      switchMap((base) => {
        const rounds = base.lastRace?.round
          ? Array.from({ length: base.lastRace.round }, (_, i) => i + 1)
          : [];
        if (!rounds.length) {
          return of({ ...base, races: [] as JolpikaRaceResult[] });
        }
        return forkJoin(
          rounds.map((r) =>
            this.f1
              .getRaceResults(r, seriesId)
              .pipe(catchError(() => of(null as JolpikaRaceResult | null))),
          ),
        ).pipe(
          map((mapResults) => ({
            ...base,
            races: mapResults.filter((r): r is JolpikaRaceResult => r != null),
          })),
        );
      }),
      tap((res) => {
        if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return;
        this.driverStands.set(res.drivers);
        this.teamStands.set(res.teams);
        this.calendar.set(res.calendar);
        this.openf1.set(res.openf1);
        this.lastRace.set(res.lastRace);
        this.races.set(res.races);
        this.loading.set(false);
        this.error.set(null);
      }),
      catchError(() => {
        if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return of(null);
        this.error.set('No se pudo cargar la clasificación.');
        this.loading.set(false);
        return of(null);
      }),
      map(() => undefined),
    );
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

  imgError(ev: Event, row?: ClDriverRow): void {
    const el = ev.target;
    if (!(el instanceof HTMLImageElement)) return;
    const sid = this.seriesCtx.id();
    if (row && isFeederSeries(sid) && !el.dataset['f2Retry']) {
      const raw = resolveDriverHeadshotRawUrl(row.driverId, sid);
      if (raw) {
        el.dataset['f2Retry'] = '1';
        el.src = raw;
        return;
      }
    }
    el.style.display = 'none';
  }

  photoLoaded(ev: Event): void {
    const el = ev.target;
    if (!(el instanceof HTMLImageElement)) return;
    this.markPhotoLoaded(el);
  }

  /** Imágenes en caché del navegador no disparan `load`; marcar igualmente. */
  markPhotoLoaded(el: HTMLImageElement): void {
    el.closest('.cl-photo-wrap')?.classList.add('cl-photo-loaded');
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
