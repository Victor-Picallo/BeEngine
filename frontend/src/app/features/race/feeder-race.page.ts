import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  catchError,
  combineLatest,
  filter,
  forkJoin,
  interval,
  map,
  of,
  skip,
  switchMap,
  tap,
} from 'rxjs';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { bindSeriesLoad, isSeriesStillActive } from '../../core/series/bind-series-load';
import { isFormulaFeederSeries } from '../../core/series/series.config';
import type { SeriesId } from '../../core/series/series.types';
import { SeriesContextService } from '../../core/series/series-context.service';
import { SeriesAccentDirective } from '../../core/series/series-accent.directive';
import { ReturnNavDirective } from '../../core/directives/return-nav.directive';
import { BackNavigationService } from '../../core/services/back-navigation.service';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { F1LiveService } from '../f1-live/f1-live.service';
import { findOfficialCircuit, projectCircuitCoords } from '../calendar/official-circuits';
import { findRaceBySlug } from './race-slug';
import {
  isMotogpSessionKey,
  MOTOGP_SESSION_CONFIGS,
  type MotogpSessionKey,
  type MotogpWeekendSession,
  sessionConfigLabel,
} from './motogp-session';
import { resolveDriverHeadshotUrl, teamColor } from '../drivers/drivers-shared';
import type {
  JolpikaCalendarRace,
  JolpikaConstructorStanding,
  JolpikaDriverStanding,
  JolpikaRaceResult,
} from '../f1-live/f1-live.types';

const GENERIC_PATH =
  'M 24 92 C 46 30 124 18 164 58 C 198 92 262 34 276 84 C 288 128 228 146 174 126 C 118 106 86 156 42 130 C 18 116 16 100 24 92 Z';

const driverShort = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1]).toUpperCase();
};

const RACE_LIVE_BUFFER_MS = 15 * 60 * 1000;
const DEFAULT_RACE_MS = 90 * 60 * 1000;

/** Ventana en la que la feature race F2 se considera “en directo”. */
export const isRaceInLiveWindow = (race: JolpikaCalendarRace, now: Date): boolean => {
  const startRaw = race.raceSessionStart ?? (race.date && race.time ? `${race.date}T${race.time}` : null);
  if (!startRaw) return false;
  const start = new Date(startRaw).getTime();
  if (!Number.isFinite(start)) return false;
  const endRaw = race.raceSessionEnd;
  const end = endRaw
    ? new Date(endRaw).getTime()
    : start + DEFAULT_RACE_MS;
  if (!Number.isFinite(end)) return false;
  const t = now.getTime();
  return t >= start - RACE_LIVE_BUFFER_MS && t <= end + RACE_LIVE_BUFFER_MS;
};

@Component({
  selector: 'app-feeder-race-page',
  standalone: true,
  imports: [
    AppHeaderComponent,
    AppSidebarComponent,
    RouterLink,
    ReturnNavDirective,
    SeriesAccentDirective,
  ],
  templateUrl: './feeder-race.page.html',
  styleUrls: ['./feeder-race.page.css', '../race/race-session.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class FeederRacePageComponent implements OnInit {
  private readonly service = inject(F1LiveService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly backNav = inject(BackNavigationService);

  readonly seriesCtx = inject(SeriesContextService);
  readonly accent = computed(() => this.seriesCtx.config().accent);
  readonly isMotogp = computed(() => this.seriesCtx.id() === 'motogp');
  readonly isF2 = computed(() => this.seriesCtx.id() === 'f2');

  /** F2: UI en directo (solo carrera, sin FP/sprint). */
  readonly useF2LiveLayout = computed(
    () =>
      this.isF2() &&
      (this.isRaceLiveWindow() || this.raceResult()?.live === true || this.raceResult()?.sessionPending === true),
  );

  returnUrl = signal<string | null>(null);
  /** Carga completa (cambio de GP o primera entrada). */
  pageLoading = signal(true);
  /** Solo al cambiar pestaña de sesión — no vacía el layout. */
  sessionLoading = signal(false);
  /** Serie + slug para no reutilizar calendario/resultados entre F2↔F3 con el mismo slug. */
  private loadedRaceKey = signal<string | null>(null);
  error = signal<string | null>(null);
  calendar = signal<JolpikaCalendarRace[]>([]);
  raceResult = signal<JolpikaRaceResult | null>(null);
  weekendSessions = signal<MotogpWeekendSession[]>([]);
  driverStands = signal<JolpikaDriverStanding[]>([]);
  constructorStands = signal<JolpikaConstructorStanding[]>([]);
  standingsTab = signal<'drivers' | 'constructors'>('drivers');
  now = signal(new Date());

  raceSlug = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('race') ?? '')),
    { initialValue: '' },
  );

  sessionKey = toSignal(
    combineLatest([this.route.paramMap, toObservable(this.seriesCtx.id)]).pipe(
      map(([params, seriesId]) => {
        const raw = params.get('session') ?? 'race';
        if (seriesId === 'motogp' && isMotogpSessionKey(raw)) return raw;
        return 'race' as MotogpSessionKey;
      }),
    ),
    { initialValue: 'race' as MotogpSessionKey },
  );

  currentRace = computed(() => {
    const slug = this.raceSlug();
    return slug ? findRaceBySlug(this.calendar(), slug) : null;
  });

  sessionLabel = computed(() => {
    const key = this.sessionKey();
    if (this.isMotogp() && isMotogpSessionKey(key)) {
      return MOTOGP_SESSION_CONFIGS[key].longLabel;
    }
    const r = this.raceResult();
    if (r?.sessionLabel) return r.sessionLabel;
    return sessionConfigLabel(key);
  });

  sessionDisplayLabel = computed(() => {
    if (this.useF2LiveLayout()) return 'CARRERA';
    const key = this.sessionKey();
    if (this.isMotogp() && isMotogpSessionKey(key)) {
      return MOTOGP_SESSION_CONFIGS[key].label;
    }
    return this.sessionLabel();
  });

  sessionTabs = computed(() => {
    if (!this.isMotogp()) return [];
    const list = this.weekendSessions();
    if (list.length) return list;
    return [{ sessionKey: 'race', label: 'RACE', hasResults: true } as MotogpWeekendSession];
  });

  liveHeaderData = computed(() => ({
    raceName: this.raceResult()?.raceName ?? this.currentRace()?.raceName ?? '',
    circuitName: this.currentRace()?.circuitName ?? '',
    round: this.currentRace()?.round ?? 0,
    totalRounds: this.calendar().length || 22,
  }));

  raceStatus = computed<'live' | 'upcoming' | 'done'>(() => {
    if (this.useF2LiveLayout()) {
      const race = this.currentRace();
      if (race?.resultsAvailable === true && !this.raceResult()?.sessionPending) return 'done';
      if (this.isRaceLiveWindow() || this.raceResult()?.live) return 'live';
      return 'upcoming';
    }
    const tab = this.sessionTabs().find((t) => t.sessionKey === this.sessionKey());
    if (tab?.hasResults && this.resultRows().length) return 'done';
    const race = this.currentRace();
    if (!race) return 'upcoming';
    const t = new Date(`${race.date}T${race.time ?? '23:59:59Z'}`);
    if (Number.isFinite(t.getTime()) && t < new Date()) return 'done';
    return 'upcoming';
  });

  statusBadges = computed(() => {
    const badges: { label: string; variant: string }[] = [];
    const status = this.raceStatus();
    if (status === 'live') {
      badges.push({ label: 'EN DIRECTO', variant: 'red' });
    } else if (status === 'done') {
      badges.push({ label: 'FINALIZADA', variant: 'green' });
    } else {
      badges.push({ label: 'PROGRAMADA', variant: 'grey' });
    }
    if (this.raceResult()?.sessionPending) {
      badges.push({ label: 'PROVISIONAL', variant: 'yellow' });
    } else if (this.resultRows().length && status === 'done') {
      badges.push({ label: 'RESULTADOS OFICIALES', variant: 'yellow' });
    }
    return badges;
  });

  isRaceLiveWindow = computed(() => {
    const race = this.currentRace();
    if (!race) return false;
    return isRaceInLiveWindow(race, this.now());
  });

  /** Fecha/hora de la carrera ya pasó (independiente de si hay datos mock). */
  isPastByDate = computed(() => {
    const race = this.currentRace();
    if (!race) return false;
    const t = new Date(`${race.date}T${race.time ?? '23:59:59Z'}`);
    return Number.isFinite(t.getTime()) && t < new Date();
  });

  /** F2/F3: solo “finalizada” si hay resultados curados; F1/MotoGP: por fecha. */
  isPast = computed(() => {
    const race = this.currentRace();
    if (!race) return false;
    const sid = this.seriesCtx.id();
    if (isFormulaFeederSeries(sid)) return race.resultsAvailable === true;
    return this.isPastByDate();
  });

  racePhase = computed<'upcoming' | 'awaiting' | 'live' | 'done'>(() => {
    const race = this.currentRace();
    if (!race) return 'upcoming';
    const sid = this.seriesCtx.id();
    if (sid === 'f2') {
      if (race.resultsAvailable === true && !this.raceResult()?.sessionPending) return 'done';
      if (this.isRaceLiveWindow() || this.raceResult()?.live) return 'live';
      return this.isPastByDate() ? 'awaiting' : 'upcoming';
    }
    if (isFormulaFeederSeries(sid)) {
      if (race.resultsAvailable === true) return 'done';
      return this.isPastByDate() ? 'awaiting' : 'upcoming';
    }
    return this.isPastByDate() ? 'done' : 'upcoming';
  });

  sessionPending = computed(() => this.raceResult()?.sessionPending === true);

  circuitSvgUrl = computed(
    () => this.currentRace()?.circuitSvgUrl ?? this.raceResult()?.circuitSvgUrl ?? null,
  );

  circuitSvg = computed(() => {
    const race = this.currentRace();
    if (!race) {
      return { circuitPath: GENERIC_PATH, viewBox: '0 0 300 170', startX: 24, startY: 92 };
    }
    return this.buildCircuitSvg(race);
  });

  podium = computed(() => {
    const results = this.raceResult()?.results ?? [];
    return results.slice(0, 3).map((r) => ({
      position: r.position,
      driver: r.driver,
      team: r.team,
      teamColor: teamColor(r.team, r.teamColor),
      time: r.time,
      driverId: r.driverId,
    }));
  });

  resultRows = computed(() => {
    const results = this.raceResult()?.results ?? [];
    const sid = this.seriesCtx.id();
    return results.map((r) => ({
      ...r,
      teamColor: teamColor(r.team, r.teamColor),
      headshotUrl: r.headshotUrl
        ? resolveDriverHeadshotUrl(r.driverId ?? '', r.driver, r.headshotUrl, { seriesId: sid })
        : '',
    }));
  });

  timingRows = computed(() =>
    this.resultRows().map((r) => ({
      pos: r.position,
      num: r.number ?? r.position,
      name: r.driver,
      short: driverShort(r.driver),
      team: r.team,
      teamColor: r.teamColor,
      gap: r.position === 1 ? '—' : r.time?.startsWith('+') ? r.time : '—',
      bestLap: r.position === 1 && !r.time?.startsWith('+') ? r.time ?? '—' : r.time ?? '—',
      laps: r.laps > 0 ? String(r.laps) : '—',
      points: r.points > 0 ? String(r.points) : '—',
      driverId: r.driverId,
    })),
  );

  tickerDrivers = computed(() => this.timingRows().slice(0, 12));

  activeStandings = computed(() => {
    const tab = this.standingsTab();
    const rows =
      tab === 'drivers'
        ? this.driverStands().map((d) => ({
            pos: d.pos,
            label: d.driver,
            points: d.points,
            color: teamColor(d.team, d.teamColor),
          }))
        : this.constructorStands().map((c) => ({
            pos: c.pos,
            label: c.team,
            points: c.points,
            color: teamColor(c.team, c.teamColor),
          }));
    const max = Math.max(...rows.map((r) => r.points), 1);
    return rows.slice(0, 10).map((r) => ({
      ...r,
      widthPct: Math.round((r.points / max) * 100),
    }));
  });

  showPointsColumn = computed(() => this.sessionKey() === 'race' || this.sessionKey() === 'sprint');

  timingTimeColLabel = computed(() => {
    const key = this.sessionKey();
    if (key === 'race' || key === 'sprint') return 'TIEMPO';
    return 'MEJOR V.';
  });

  dateLabel = computed(() => {
    const race = this.currentRace();
    if (!race) return '';
    const d = new Date(`${race.date}T${race.time ?? '12:00:00Z'}`);
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  });

  backLabel = computed(() =>
    this.backNav.labelFor(this.returnUrl(), this.seriesCtx.urlPath('calendario')),
  );

  ngOnInit(): void {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(new Date()));

    interval(12_000)
      .pipe(
        filter(() => this.isF2() && this.isRaceLiveWindow()),
        switchMap(() => this.reloadSessionResults('f2')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  constructor() {
    bindSeriesLoad((seriesId) => {
      this.loadedRaceKey.set(null);
      return this.loadRace(seriesId);
    }, this.destroyRef);

    this.route.paramMap
      .pipe(
        skip(1),
        switchMap((params) => {
          const seriesId = this.seriesCtx.id();
          const slug = params.get('race') ?? '';
          const key = this.raceLoadKey(seriesId, slug);
          if (this.loadedRaceKey() === key && this.calendar().length) {
            return this.reloadSessionResults(seriesId);
          }
          return this.loadRace(seriesId);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  goBack(): void {
    this.backNav.goBack(this.seriesCtx.path('calendario'), this.returnUrl());
  }

  buildSessionLink(key: string): (string | number)[] {
    return this.seriesCtx.path('calendario', this.raceSlug(), key);
  }

  setStandingsTab(tab: 'drivers' | 'constructors'): void {
    this.standingsTab.set(tab);
  }

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  today(): string {
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(this.now());
  }

  positionLabel(pos: number): string {
    return pos === 1 ? '1º' : pos === 2 ? '2º' : pos === 3 ? '3º' : `${pos}º`;
  }

  positionColor(pos: number): string {
    if (pos === 1) return '#C8963E';
    if (pos === 2) return '#7A8A96';
    if (pos === 3) return '#8B5A2B';
    return '#888';
  }

  driverLink(driverId: string | null | undefined): (string | number)[] | null {
    const id = (driverId ?? '').trim();
    if (!id || id === 'unknown') return null;
    return this.seriesCtx.path('pilotos', id);
  }

  private buildCircuitSvg(race: JolpikaCalendarRace): {
    circuitPath: string;
    viewBox: string;
    startX: number;
    startY: number;
  } {
    const fallback = { circuitPath: GENERIC_PATH, viewBox: '0 0 300 170', startX: 24, startY: 92 };
    const official = findOfficialCircuit(race.circuitName) ?? findOfficialCircuit(race.locality);
    if (!official) return fallback;

    const points = projectCircuitCoords(official.coords);
    if (points.length < 3) return fallback;

    const minX = Math.min(...points.map((p) => p[0]));
    const maxX = Math.max(...points.map((p) => p[0]));
    const minY = Math.min(...points.map((p) => p[1]));
    const maxY = Math.max(...points.map((p) => p[1]));
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);
    const scale = Math.min(260 / width, 130 / height);
    const offsetX = (300 - width * scale) / 2 - minX * scale;
    const offsetY = (170 - height * scale) / 2 - minY * scale;
    const projected = points.map(([x, y]) => [x * scale + offsetX, y * scale + offsetY]);
    const [first, ...rest] = projected;
    const path = `M ${first[0].toFixed(1)} ${first[1].toFixed(1)} ${rest.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')}`;

    return {
      circuitPath: path,
      viewBox: '0 0 300 170',
      startX: Number(first[0].toFixed(1)),
      startY: Number(first[1].toFixed(1)),
    };
  }

  private raceLoadKey(seriesId: SeriesId, slug: string): string {
    return `${seriesId}:${slug}`;
  }

  private reloadSessionResults(seriesId: SeriesId) {
    const slug = this.route.snapshot.paramMap.get('race') ?? '';
    const rawSession = this.route.snapshot.paramMap.get('session') ?? 'race';
    const session =
      seriesId === 'motogp' && isMotogpSessionKey(rawSession) ? rawSession : 'race';
    const race = findRaceBySlug(this.calendar(), slug);
    if (!race) return of(null);

    this.sessionLoading.set(true);
    return this.service.getRaceResults(race.round, seriesId, session).pipe(
      tap((result) => {
        if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return;
        if (result) this.raceResult.set(result);
        this.sessionLoading.set(false);
      }),
      catchError(() => {
        if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return of(null);
        this.sessionLoading.set(false);
        return of(null);
      }),
      map(() => undefined),
    );
  }

  private loadRace(seriesId: SeriesId) {
    const slug = this.route.snapshot.paramMap.get('race') ?? this.raceSlug();
    const rawSession = this.route.snapshot.paramMap.get('session') ?? 'race';
    const session =
      seriesId === 'motogp' && isMotogpSessionKey(rawSession)
        ? rawSession
        : 'race';
    const loadKey = this.raceLoadKey(seriesId, slug);
    const isNewRace = this.loadedRaceKey() !== loadKey;

    this.pageLoading.set(isNewRace || !this.calendar().length);
    this.sessionLoading.set(false);
    this.error.set(null);
    if (isNewRace) {
      this.calendar.set([]);
      this.raceResult.set(null);
      this.weekendSessions.set([]);
      this.driverStands.set([]);
      this.constructorStands.set([]);
    }
    if (!this.returnUrl()) {
      this.returnUrl.set(this.backNav.captureReturnUrl());
    }

    return this.service.getCalendar(seriesId).pipe(
      switchMap((cal) => {
        if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return of(null);
        this.calendar.set(cal);
        const race = findRaceBySlug(cal, slug);
        if (!race) {
          this.error.set('No hemos encontrado esta ronda en el calendario.');
          this.pageLoading.set(false);
          this.loadedRaceKey.set(null);
          return of(null);
        }

        const f2Live =
          seriesId === 'f2' &&
          (race.resultsAvailable === true || isRaceInLiveWindow(race, new Date()));

        const extras$ =
          seriesId === 'motogp'
            ? forkJoin({
                sessions: this.service.getRoundSessions(race.round, seriesId).pipe(
                  catchError(() => of({ sessions: [] as MotogpWeekendSession[] })),
                ),
                drivers: this.service.getDriverStandings(false, seriesId).pipe(catchError(() => of([]))),
                teams: this.service.getConstructorStandings(false, seriesId).pipe(catchError(() => of([]))),
              })
            : f2Live
              ? forkJoin({
                  sessions: of({ sessions: [] as MotogpWeekendSession[] }),
                  drivers: this.service.getDriverStandings(false, seriesId).pipe(catchError(() => of([]))),
                  teams: this.service.getConstructorStandings(false, seriesId).pipe(catchError(() => of([]))),
                })
              : of({
                  sessions: { sessions: [] as MotogpWeekendSession[] },
                  drivers: [] as JolpikaDriverStanding[],
                  teams: [] as JolpikaConstructorStanding[],
                });

        return extras$.pipe(
          switchMap((extras) => {
            if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return of(null);
            this.weekendSessions.set(extras.sessions.sessions ?? []);
            this.driverStands.set(extras.drivers);
            this.constructorStands.set(extras.teams);

            if (seriesId !== 'motogp') {
              const f2InLive =
                seriesId === 'f2' && isRaceInLiveWindow(race, new Date());
              if (isFormulaFeederSeries(seriesId) && race.resultsAvailable !== true && !f2InLive) {
                this.pageLoading.set(false);
                this.loadedRaceKey.set(loadKey);
                return of(null);
              }
              const raceTime = new Date(`${race.date}T${race.time ?? '23:59:59Z'}`);
              const past =
                Number.isFinite(raceTime.getTime()) && raceTime < new Date();
              if (!past && !isFormulaFeederSeries(seriesId)) {
                this.pageLoading.set(false);
                this.loadedRaceKey.set(loadKey);
                return of(null);
              }
            }

            return this.service.getRaceResults(race.round, seriesId, session).pipe(
              catchError(() => of(null)),
            );
          }),
        );
      }),
      tap((result) => {
        if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return;
        if (result) this.raceResult.set(result);
        this.loadedRaceKey.set(loadKey);
        this.pageLoading.set(false);
      }),
      catchError(() => {
        if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return of(null);
        this.error.set('No se pudo cargar la información de la carrera.');
        this.pageLoading.set(false);
        this.loadedRaceKey.set(null);
        return of(null);
      }),
      map(() => undefined),
    );
  }
}
