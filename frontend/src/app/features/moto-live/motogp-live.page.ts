import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, filter, forkJoin, interval, map, of, skip, switchMap, tap } from 'rxjs';
import { MotoLiveService } from './moto-live.service';
import { MotoContextService } from '../../core/moto/moto-context.service';
import { BackNavigationService } from '../../core/services/back-navigation.service';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import {
  startCircuitMapAnimation,
  type CircuitMapAnimationHandle,
  type MapDot,
} from './moto-live-map';
import { findRaceBySlug, slugifyRace } from '../race/race-slug';
import {
  isMotogpSessionKey,
  MOTOGP_SESSION_CONFIGS,
  type MotogpSessionKey,
  type MotogpWeekendSession,
} from '../race/motogp-session';
import { pulseLiveSessionKeyFromShort } from './moto-live-session-key';
import type {
  JolpikaCalendarRace,
  JolpikaDriverStanding,
  JolpikaRaceResult,
  OpenF1Weather,
  RadioMessage,
  SectorColor,
  TimingDriver,
} from '../f1-live/f1-live.types';
import type { MotogpLiveFeedPayload, MotogpLiveTimingRider } from './moto-live.types';

const driverShort = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1]).toUpperCase();
};

const bikeLabelFrom = (name: string): string => {
  const n = String(name ?? '').trim();
  if (!n || n === '—') return '—';
  if (n.length <= 4) return n.toUpperCase();
  return n.slice(0, 3).toUpperCase();
};

@Component({
  selector: 'app-motogp-live-page',
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive, AppHeaderComponent],
  templateUrl: './motogp-live.page.html',
  styleUrl: '../f1-live/f1-live.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[style.--fl-accent]': 'accent()',
    '[style.--fl-accent-soft]': 'accentSoft()',
  },
})
export class MotogpLivePageComponent implements OnInit, OnDestroy {
  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('mapCanvas');

  private readonly service = inject(MotoLiveService);
  readonly motoCtx = inject(MotoContextService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly backNav = inject(BackNavigationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);

  readonly accent = computed(() => this.motoCtx.config().accent);
  readonly accentSoft = computed(() => {
    const hex = this.accent().replace('#', '');
    if (hex.length !== 6) return 'rgba(0,82,204,0.12)';
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},0.12)`;
  });

  returnUrl = signal<string | null>(null);
  radioFilter = signal<'all' | 'control'>('all');

  raceSlug = toSignal(this.route.paramMap.pipe(map((p) => p.get('race') ?? '')), {
    initialValue: '',
  });

  routeSessionKey = toSignal(
    this.route.paramMap.pipe(
      map((p) => {
        const raw = p.get('session') ?? 'race';
        return isMotogpSessionKey(raw) ? raw : ('race' as MotogpSessionKey);
      }),
    ),
    { initialValue: 'race' as MotogpSessionKey },
  );

  loading = signal(true);
  sessionLoading = signal(false);
  error = signal<string | null>(null);
  feed = signal<MotogpLiveFeedPayload | null>(null);
  raceResult = signal<JolpikaRaceResult | null>(null);
  calendar = signal<JolpikaCalendarRace[]>([]);
  weekendSessions = signal<MotogpWeekendSession[]>([]);
  driverStands = signal<JolpikaDriverStanding[]>([]);
  teamStands = signal<{ pos: number; team: string; points: number; teamColor: string | null }[]>([]);

  activeSessionKey = signal<MotogpSessionKey>('race');
  round = signal(1);
  standingsTab = signal<'drivers' | 'constructors'>('drivers');
  now = signal(new Date());

  inCalendarRoute = computed(() => Boolean(this.raceSlug()));

  notFound = computed(
    () => Boolean(this.raceSlug()) && !this.loading() && !this.currentRace() && this.calendar().length > 0,
  );

  showLapCounters = computed(() => {
    const k = this.activeSessionKey();
    return k === 'race' || k === 'sprint';
  });

  seriesLabel = computed(() => this.motoCtx.config().short);

  backLabel = computed(() =>
    this.backNav.labelFor(this.returnUrl(), `${this.motoCtx.homePath()}/calendario`),
  );

  activeSessionLabel = computed(() => {
    const key = this.activeSessionKey();
    const tab = this.sessionTabs().find((t) => t.sessionKey === key);
    return tab?.label ?? MOTOGP_SESSION_CONFIGS[key]?.label ?? key.toUpperCase();
  });

  totalRounds = computed(() => this.calendar().length || 22);

  currentRace = computed(() => {
    const cal = this.calendar();
    const slug = this.raceSlug();
    if (slug) return findRaceBySlug(cal, slug);
    const r = this.round();
    return cal.find((c) => c.round === r) ?? cal[cal.length - 1] ?? null;
  });

  sessionTabs = computed((): MotogpWeekendSession[] => {
    const list = this.weekendSessions();
    if (list.length) return list;
    return [
      { sessionKey: 'fp1', label: 'FP1', date: null, status: null, hasResults: false },
      { sessionKey: 'fp2', label: 'FP2', date: null, status: null, hasResults: false },
      { sessionKey: 'q1', label: 'Q1', date: null, status: null, hasResults: false },
      { sessionKey: 'q2', label: 'Q2', date: null, status: null, hasResults: false },
      { sessionKey: 'race', label: 'RACE', date: null, status: null, hasResults: true },
    ];
  });

  liveTimingMatchesSession = computed(() => {
    const f = this.feed()?.timing;
    if (!f?.active || !f.head) return false;
    return pulseLiveSessionKeyFromShort(f.head.sessionShortName) === this.activeSessionKey();
  });

  isSessionLive = computed(() => {
    const tab = this.sessionTabs().find((t) => t.sessionKey === this.activeSessionKey());
    if (tab?.isLive) return true;
    return this.liveTimingMatchesSession() && (this.feed()?.timing?.riders?.length ?? 0) > 0;
  });

  racePhase = computed<'live' | 'done' | 'upcoming'>(() => {
    if (this.isSessionLive()) return 'live';
    const res = this.raceResult();
    if (res?.results?.length && !res.live && !res.sessionPending) return 'done';
    const tab = this.sessionTabs().find((t) => t.sessionKey === this.activeSessionKey());
    if (tab?.hasResults && (res?.results?.length ?? 0) > 0) return 'done';
    return 'upcoming';
  });

  liveHeaderData = computed(() => {
    const f = this.feed();
    const race = this.currentRace();
    const res = this.raceResult();
    return {
      raceName: f?.eventName ?? res?.raceName ?? race?.raceName ?? 'Gran Premio',
      circuitName: f?.circuitName ?? res?.circuitName ?? race?.circuitName ?? '—',
      locality: race?.locality ?? '—',
      round: race?.round ?? this.round(),
      totalRounds: this.totalRounds(),
    };
  });

  timingRows = computed<TimingDriver[]>(() => {
    const f = this.feed();
    const liveRiders = f?.timing?.riders ?? [];
    const useLive =
      this.isSessionLive() &&
      this.liveTimingMatchesSession() &&
      liveRiders.some((r) => r.position > 0);

    if (useLive) {
      return liveRiders
        .filter((r) => r.position > 0)
        .map((r) => this.riderToTimingRow(r))
        .sort((a, b) => a.pos - b.pos);
    }

    const official = this.raceResult()?.results ?? [];
    if (official.length) {
      const sectorByShort = new Map<string, { s1: string; s2: string; s3: string }>();
      for (const r of liveRiders) {
        const key = (r.shortName || '').toUpperCase();
        if (key) sectorByShort.set(key, { s1: r.s1 ?? '—', s2: r.s2 ?? '—', s3: r.s3 ?? '—' });
      }
      return official.map((r) => {
        const short = driverShort(r.driver);
        const sec = sectorByShort.get(short.toUpperCase());
        const s1c = (liveRiders.find((lr) => lr.shortName?.toUpperCase() === short.toUpperCase())?.s1c as SectorColor) ?? 'sec-white';
        const s2c = (liveRiders.find((lr) => lr.shortName?.toUpperCase() === short.toUpperCase())?.s2c as SectorColor) ?? 'sec-white';
        const s3c = (liveRiders.find((lr) => lr.shortName?.toUpperCase() === short.toUpperCase())?.s3c as SectorColor) ?? 'sec-white';
        return {
          pos: r.position,
          num: r.number ?? r.position,
          name: r.driver,
          short,
          team: r.team,
          teamColor: r.teamColor ?? this.accent(),
          gap: r.position === 1 ? '—' : r.time?.startsWith('+') ? r.time : r.time ?? '—',
          interval: '—',
          lastLap: '—',
          bestLap:
            r.position === 1 && r.time && !r.time.startsWith('+')
              ? r.time
              : r.time ?? '—',
          tire: 'm' as const,
          tyreAge: 0,
          laps: r.laps > 0 ? r.laps : 0,
          drs: false,
          s1: sec?.s1 ?? '—',
          s2: sec?.s2 ?? '—',
          s3: sec?.s3 ?? '—',
          s1c,
          s2c,
          s3c,
          speed: 0,
          bikeLabel: '—',
          driverId: r.driverId ?? null,
        };
      });
    }

    if (liveRiders.length) {
      return liveRiders
        .filter((r) => r.position > 0)
        .map((r) => this.riderToTimingRow(r))
        .sort((a, b) => a.pos - b.pos);
    }

    return [];
  });

  tickerDrivers = computed(() => this.timingRows().slice(0, 10));

  currentWeather = computed((): OpenF1Weather | null => {
    const w = this.feed()?.weather;
    if (!w) return null;
    return w as unknown as OpenF1Weather;
  });

  currentLap = computed(() => {
    if (!this.isSessionLive()) {
      const leader = this.raceResult()?.results?.[0];
      return leader?.laps && leader.laps > 0 ? leader.laps : null;
    }
    const riders = this.feed()?.timing?.riders ?? [];
    if (!riders.length) return null;
    return Math.max(...riders.map((r) => r.laps || 0), 0);
  });

  totalLapsDisplay = computed(() => {
    const n = this.feed()?.timing?.head?.totalLaps;
    if (n && n > 0) return String(n);
    const leader = this.raceResult()?.results?.[0];
    return leader?.laps && leader.laps > 0 ? String(leader.laps) : '—';
  });

  elapsedDisplay = computed(() => {
    if (!this.isSessionLive()) return '--:--:--';
    const rem = this.feed()?.timing?.head?.remaining;
    return rem != null && String(rem) !== '0' ? String(rem) : '--:--:--';
  });

  driverStandingsDisplay = computed(() =>
    this.driverStands().map((d) => ({
      pos: d.pos,
      short: d.driver.split(' ').pop() ?? d.driver,
      name: d.driver,
      points: d.points,
      teamColor: d.teamColor ?? this.accent(),
    })),
  );

  constructorStandingsDisplay = computed(() =>
    this.teamStands().map((c) => ({
      pos: c.pos,
      name: c.team,
      points: c.points,
      color: c.teamColor ?? this.accent(),
    })),
  );

  activeStandings = computed(() => {
    const tab = this.standingsTab();
    if (tab === 'drivers') {
      const list = this.driverStandingsDisplay();
      const max = Math.max(...list.map((d) => d.points), 1);
      return list.map((d) => ({
        pos: d.pos,
        label: d.short,
        color: d.teamColor,
        points: d.points,
        widthPct: (d.points / max) * 100,
      }));
    }
    const list = this.constructorStandingsDisplay();
    const max = Math.max(...list.map((c) => c.points), 1);
    return list.map((c) => ({
      pos: c.pos,
      label: c.name,
      color: c.color,
      points: c.points,
      widthPct: (c.points / max) * 100,
    }));
  });

  raceControlFeed = computed<RadioMessage[]>(() => {
    const msgs = this.feed()?.messages ?? [];
    return msgs.map((m) => ({
      time: this.fmtFeedTime(m.date),
      type: 'control' as const,
      from:
        m.category === 'Flag'
          ? 'Race Control'
          : m.category === 'Pit'
            ? 'Pit Lane'
            : this.seriesLabel(),
      msg: m.message,
      urgent: Boolean(m.urgent),
    }));
  });

  filteredRadio = computed(() => {
    const feed = this.raceControlFeed();
    const f = this.radioFilter();
    return f === 'all' ? feed : feed;
  });

  timingEmptySubtitle = computed(() => {
    if (this.racePhase() === 'upcoming') return 'Sesión programada — esperando datos oficiales';
    if (this.racePhase() === 'done') return 'Consulta otra sesión del fin de semana o vuelve más tarde';
    return 'Sin timing en vivo — datos oficiales cuando estén disponibles';
  });

  hasSectorData = computed(() => {
    const src = this.feed()?.sectorsSource;
    return src === 'best-partial-pdf' || src === 'analysis-pdf';
  });

  statusBadges = computed<{ label: string; variant: 'green' | 'grey' | 'yellow' }[]>(() => {
    const badges: { label: string; variant: 'green' | 'grey' | 'yellow' }[] = [];
    const phase = this.racePhase();
    if (phase === 'live') badges.push({ label: 'EN DIRECTO', variant: 'green' });
    else if (phase === 'done') badges.push({ label: 'FINALIZADA', variant: 'grey' });
    else badges.push({ label: 'PROGRAMADA', variant: 'grey' });

    const res = this.raceResult();
    if (res?.sessionPending) badges.push({ label: 'PROVISIONAL', variant: 'yellow' });
    else if (phase === 'done' && res?.results?.length) {
      badges.push({ label: 'RESULTADOS OFICIALES', variant: 'yellow' });
    }

    const head = this.feed()?.timing?.head;
    const st = String(head?.sessionStatusId ?? head?.sessionStatus ?? '').toUpperCase();
    if (st === 'R') badges.push({ label: 'BANDERA ROJA', variant: 'yellow' });

    const src = this.feed()?.sectorsSource;
    if (src === 'best-partial-pdf') badges.push({ label: 'SECTORES PDF', variant: 'green' });
    return badges;
  });

  dotNamesDisplay = computed(() => this.timingRows().slice(0, 5).map((r) => r.short));
  dotColorsDisplay = computed(() => this.timingRows().slice(0, 5).map((r) => r.teamColor));

  riderOnPit = (num: number): boolean => {
    const r = this.feed()?.timing?.riders?.find((x) => x.riderNumber === num);
    return Boolean(r?.onPit);
  };

  timingPanelLive = computed(() => this.racePhase() === 'live');

  private mapHandle: CircuitMapAnimationHandle | null = null;
  private calendarReady = false;

  constructor() {
    effect(() => {
      const slug = this.raceSlug();
      const key = this.activeSessionKey();
      const tabs = this.sessionTabs();
      if (!slug || !tabs.length) return;
      const valid = tabs.some((t) => t.sessionKey === key);
      if (valid) return;
      const fallback = tabs.find((t) => t.hasResults)?.sessionKey ?? tabs[0]?.sessionKey ?? 'race';
      untracked(() => {
        void this.router.navigate(
          [this.motoCtx.homePath(), 'calendario', slug, fallback],
          { replaceUrl: true },
        );
      });
    });
  }

  ngOnInit(): void {
    this.returnUrl.set(this.backNav.captureReturnUrl());
    const qp = this.route.snapshot.queryParamMap;
    const qRound = Number.parseInt(qp.get('round') ?? '', 10);
    const qSession = qp.get('session');
    if (Number.isInteger(qRound) && qRound > 0) this.round.set(qRound);
    if (qSession && isMotogpSessionKey(qSession)) this.activeSessionKey.set(qSession);

    if (this.route.snapshot.paramMap.get('session')) {
      this.activeSessionKey.set(this.routeSessionKey());
    }

    this.bootstrap();

    this.route.paramMap
      .pipe(
        skip(1),
        tap(() => {
          this.activeSessionKey.set(this.routeSessionKey());
          this.sessionLoading.set(true);
        }),
        switchMap(() => this.reloadRoundData()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    interval(1_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(new Date()));

    interval(5_000)
      .pipe(
        filter(() => this.isSessionLive()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refreshFeed());

    interval(12_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshFeed());
  }

  goBack(): void {
    this.backNav.goBack(`${this.motoCtx.homePath()}/calendario`, this.returnUrl());
  }

  setRadioFilter(f: 'all' | 'control'): void {
    this.radioFilter.set(f);
  }

  buildSessionLink(key: string): (string | number)[] {
    const slug = this.raceSlug() || (this.currentRace() ? slugifyRace(this.currentRace()!) : '');
    return [this.motoCtx.homePath(), 'calendario', slug, key];
  }

  driverLink(driverId: string | null | undefined): (string | number)[] | null {
    const id = (driverId ?? '').trim();
    if (!id || id === 'unknown') return null;
    return [this.motoCtx.homePath(), 'pilotos', id];
  }

  ngOnDestroy(): void {
    this.mapHandle?.stop();
  }

  goSession(sessionKey: string): void {
    if (isMotogpSessionKey(sessionKey)) {
      this.activeSessionKey.set(sessionKey);
    }
    const race = this.currentRace();
    if (race) {
      void this.router.navigate([
        this.motoCtx.homePath(),
        'calendario',
        slugifyRace(race),
        sessionKey,
      ]);
      return;
    }
    this.sessionLoading.set(true);
    this.reloadRoundData().subscribe();
  }

  setStandingsTab(tab: 'drivers' | 'constructors'): void {
    this.standingsTab.set(tab);
  }

  windDirStr(deg: number): string {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
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

  private bootstrap(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.getCalendar().subscribe({
      next: (cal) => {
        this.calendar.set(cal);
        this.calendarReady = true;
        const slug = this.raceSlug();
        let race = slug ? findRaceBySlug(cal, slug) : null;

        if (slug && !race) {
          this.error.set('No hemos encontrado esta ronda en el calendario.');
          this.loading.set(false);
          return;
        }

        if (!race) {
          const qRound = this.round();
          race =
            cal.find((r) => r.round === qRound) ??
            cal.find((r) => r.date >= new Date().toISOString().slice(0, 10)) ??
            cal[cal.length - 1] ??
            null;
        }

        if (!race) {
          this.error.set('Calendario MotoGP no disponible.');
          this.loading.set(false);
          return;
        }

        this.round.set(race.round);

        if (!slug) {
          void this.router.navigate(
            [this.motoCtx.homePath(), 'calendario', slugifyRace(race), this.activeSessionKey()],
            { replaceUrl: true },
          );
        }

        this.reloadRoundData().subscribe();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el calendario MotoGP.');
      },
    });

    this.service.getDriverStandings().subscribe({
      next: (d) => this.driverStands.set(d),
      error: () => {},
    });
    this.service.getTeamStandings().subscribe({
      next: (t) =>
        this.teamStands.set(
          t.map((row) => ({
            pos: row.pos,
            team: row.team,
            points: row.points,
            teamColor: row.teamColor ?? null,
          })),
        ),
      error: () => {},
    });
  }

  private reloadRoundData() {
    const round = this.round();
    const session = this.activeSessionKey();
    if (!round) return of(null);

    return forkJoin({
      sessions: this.service.getRoundSessions(round).pipe(
        catchError(() => of({ sessions: [] as MotogpWeekendSession[] })),
      ),
      results: this.service.getRaceResults(round, session).pipe(catchError(() => of(null))),
      feed: this.service.getLiveFeed(round, session).pipe(
        catchError(() => of(null)),
      ),
    }).pipe(
      tap(({ sessions, results, feed }) => {
        this.weekendSessions.set(sessions.sessions ?? []);
        const mergedResults = results ?? feed?.sessionResults ?? null;
        if (mergedResults) this.raceResult.set(mergedResults);
        if (feed) {
          this.feed.set(feed);
          if (feed.sessionResults && !results) this.raceResult.set(feed.sessionResults);
          if (!this.inCalendarRoute()) {
            this.round.set(feed.round);
            if (isMotogpSessionKey(feed.sessionKey)) {
              this.activeSessionKey.set(feed.sessionKey);
            }
          }
        }
        this.loading.set(false);
        this.sessionLoading.set(false);
        this.error.set(null);
        this.restartMap();
      }),
      catchError(() => {
        this.loading.set(false);
        this.sessionLoading.set(false);
        this.error.set('No se pudo cargar la sesión MotoGP.');
        return of(null);
      }),
    );
  }

  private refreshFeed(): void {
    if (!this.calendarReady) return;
    const round = this.round();
    if (!round) return;

    this.service.getLiveFeed(round, this.activeSessionKey()).subscribe({
      next: (data) => {
        this.feed.set(data);
        if (data.sessionResults) this.raceResult.set(data.sessionResults);
        if (!this.inCalendarRoute() && isMotogpSessionKey(data.sessionKey)) {
          this.activeSessionKey.set(data.sessionKey);
          this.round.set(data.round);
        }
        this.restartMap();
      },
      error: () => {},
    });

    this.service.getRaceResults(round, this.activeSessionKey()).subscribe({
      next: (r) => {
        if (r) this.raceResult.set(r);
      },
      error: () => {},
    });
  }

  private riderToTimingRow(r: MotogpLiveTimingRider): TimingDriver {
    const s1 = r.s1 ?? '—';
    const s2 = r.s2 ?? '—';
    const s3 = r.s3 ?? '—';
    const s1c = (r.s1c as SectorColor) ?? 'sec-white';
    const s2c = (r.s2c as SectorColor) ?? 'sec-white';
    const s3c = (r.s3c as SectorColor) ?? 'sec-white';
    const bikeName = r.bikeName ?? r.bike ?? '—';
    return {
      pos: r.position,
      num: r.riderNumber,
      name: r.driver,
      short: r.shortName || String(r.riderNumber),
      team: r.team,
      teamColor: r.teamColor,
      gap: r.gap,
      interval: r.interval,
      lastLap: r.lastLap,
      bestLap: r.bestLap,
      tire: 'm',
      tyreAge: 0,
      laps: r.laps,
      drs: false,
      s1,
      s2,
      s3,
      s1c,
      s2c,
      s3c,
      speed: 0,
      bikeLabel: bikeLabelFrom(bikeName),
      driverId: r.riderId || null,
    };
  }

  private restartMap(): void {
    this.mapHandle?.stop();
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    const rows = this.timingRows();
    const dots: MapDot[] =
      this.racePhase() === 'live'
        ? rows.map((d) => ({
            pos: d.pos,
            short: d.short,
            teamColor: d.teamColor,
          }))
        : [];
    const head = this.feed()?.timing?.head;
    const leader = rows.find((r) => r.pos === 1);
    const lapProgress =
      head?.totalLaps && leader?.laps
        ? Math.min(100, (leader.laps / head.totalLaps) * 100)
        : this.racePhase() === 'done'
          ? 100
          : 12;
    this.zone.runOutsideAngular(() => {
      this.mapHandle = startCircuitMapAnimation(canvas, head?.circuitName ?? '', dots, {
        accent: this.accent(),
        locality: this.currentRace()?.locality,
        lapProgress,
        zone: this.zone,
      });
    });
  }

  private fmtFeedTime(iso: string): string {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(iso));
    } catch {
      return '—';
    }
  }
}
