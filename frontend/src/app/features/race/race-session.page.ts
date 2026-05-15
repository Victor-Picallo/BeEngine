import {
  ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef,
  inject, NgZone, OnDestroy, OnInit, signal, viewChild, ViewEncapsulation,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';
import { F1LiveService } from '../f1-live/f1-live.service';
import { findOfficialCircuit, projectCircuitCoords } from '../calendar/official-circuits';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import {
  defaultSessionFor, findRaceBySlug, isValidSession,
  SESSION_CONFIGS, SESSION_ORDER, SessionKey, slugifyRace,
} from './race-slug';
import type {
  ConstructorStandingDisplay, DriverStandingDisplay, JolpikaCalendarRace,
  JolpikaConstructorStanding, JolpikaDriverStanding, JolpikaLastRace,
  OpenF1Driver, OpenF1Interval, OpenF1Lap, OpenF1Location, OpenF1Position,
  OpenF1RaceControl, OpenF1Session, OpenF1Stint, OpenF1TeamRadio, OpenF1Weather,
  RadioMessage, SectorColor, TimingDriver, TireType,
} from '../f1-live/f1-live.types';

const TEAM_COLORS: Record<string, string> = {
  'Mercedes':         '#27F4D2',
  'Red Bull':         '#3671C6',
  'Red Bull Racing':  '#3671C6',
  'Ferrari':          '#E8002D',
  'McLaren':          '#FF8000',
  'Aston Martin':     '#358C75',
  'Alpine':           '#0093CC',
  'Alpine F1 Team':   '#0093CC',
  'Williams':         '#64C4FF',
  'Haas':             '#B6BABD',
  'Haas F1 Team':     '#B6BABD',
  'RB':               '#6692FF',
  'RB F1 Team':       '#6692FF',
  'Kick Sauber':      '#52E252',
  'Sauber':           '#52E252',
  'Audi':             '#E5002B',
  'Cadillac F1 Team': '#C0C0C0',
};

const TIRE_CYCLE: TireType[] = ['m', 'm', 'h', 'm', 'h', 's', 'h', 'm', 'h', 's', 'm', 'h', 's', 'm', 'h', 's', 'm', 'h', 's', 'm'];

const FALLBACK_PATH: [number, number][] = [
  [120, 78], [128, 70], [140, 62], [152, 58], [160, 52], [172, 48], [184, 46], [196, 46],
  [208, 48], [218, 54], [224, 64], [222, 76], [214, 84], [202, 88], [190, 86], [180, 80],
  [174, 70], [178, 60], [188, 58], [198, 64], [200, 74], [192, 80], [182, 82],
  [172, 86], [160, 92], [148, 100], [136, 108], [124, 116], [112, 122], [100, 126],
  [88, 126], [76, 122], [66, 114], [62, 102], [64, 90], [70, 80], [78, 74], [88, 72],
  [98, 74], [108, 80], [114, 90], [112, 100], [104, 108], [96, 116], [90, 124],
  [100, 130], [114, 132], [128, 130], [140, 124], [148, 116], [152, 106], [158, 98],
  [168, 96], [180, 98], [192, 102], [204, 106], [216, 108], [228, 108], [238, 104],
  [244, 98], [242, 90], [236, 86], [228, 88], [224, 96], [230, 104], [240, 108],
  [228, 112], [214, 116], [200, 118], [186, 118], [172, 116], [158, 114], [144, 114],
  [132, 116], [120, 118], [108, 116], [100, 110], [96, 100], [98, 90], [106, 84], [114, 80], [120, 78],
];

const FALLBACK_DOT_COLORS = ['#FFD100', '#E8002D', '#FF8000', '#27F4D2', '#64C4FF'];
const FALLBACK_DOT_NAMES = ['P1', 'P2', 'P3', 'P4', 'P5'];

const COMPOUND_MAP: Record<string, TireType> = { SOFT: 's', MEDIUM: 'm', HARD: 'h', INTERMEDIATE: 'i', WET: 'w' };

const OPENF1_SESSION_TO_KEY: Record<string, SessionKey> = {
  'Practice 1':        'fp1',
  'Practice 2':        'fp2',
  'Practice 3':        'fp3',
  'Qualifying':        'qualy',
  'Sprint Shootout':   'qualy-sprint',
  'Sprint Qualifying': 'qualy-sprint',
  'Sprint':            'sprint',
  'Race':              'race',
};

const SESSION_KEY_TO_OPENF1_NAMES: Record<SessionKey, string[]> = {
  fp1:            ['Practice 1'],
  fp2:            ['Practice 2'],
  fp3:            ['Practice 3'],
  qualy:          ['Qualifying'],
  'qualy-sprint': ['Sprint Shootout', 'Sprint Qualifying'],
  sprint:         ['Sprint'],
  race:           ['Race'],
};

const norm = (s: string): string =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

@Component({
  selector: 'app-race-session-page',
  standalone: true,
  imports: [NgClass, RouterLink, AppHeaderComponent],
  templateUrl: './race-session.page.html',
  styleUrl: './race-session.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class RaceSessionPageComponent implements OnInit, OnDestroy {
  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('mapCanvas');

  private readonly service    = inject(F1LiveService);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone       = inject(NgZone);

  // ── Route-derived state ──
  raceSlug = toSignal(
    this.route.paramMap.pipe(map(p => p.get('race') ?? '')),
    { initialValue: '' },
  );
  sessionKey = toSignal(
    this.route.paramMap.pipe(map(p => {
      const s = p.get('session');
      return isValidSession(s) ? s : 'fp1';
    })),
    { initialValue: 'fp1' as SessionKey },
  );

  sessionConfig = computed(() => SESSION_CONFIGS[this.sessionKey()]);
  showLapCount = computed(() => {
    const k = this.sessionKey();
    return k === 'sprint' || k === 'race';
  });
  readonly SESSION_ORDER = SESSION_ORDER;
  readonly SESSION_CONFIGS = SESSION_CONFIGS;

  // ── Data signals ──
  loading           = signal(true);
  error             = signal<string | null>(null);
  openF1Drivers     = signal<OpenF1Driver[]>([]);
  positions         = signal<OpenF1Position[]>([]);
  weather           = signal<OpenF1Weather | null>(null);
  sessions          = signal<OpenF1Session[]>([]);
  laps              = signal<OpenF1Lap[]>([]);
  intervals         = signal<OpenF1Interval[]>([]);
  stints            = signal<OpenF1Stint[]>([]);
  raceControl       = signal<OpenF1RaceControl[]>([]);
  teamRadio         = signal<OpenF1TeamRadio[]>([]);
  locations         = signal<OpenF1Location[]>([]);
  driverStands      = signal<JolpikaDriverStanding[]>([]);
  constructorStands = signal<JolpikaConstructorStanding[]>([]);
  calendar          = signal<JolpikaCalendarRace[]>([]);
  lastRace          = signal<JolpikaLastRace | null>(null);

  standingsTab = signal<'drivers' | 'constructors'>('drivers');
  radioFilter  = signal<'all' | 'radio' | 'control'>('all');
  now          = signal(new Date());

  // ── Race resolution from route slug ──
  currentRace = computed<JolpikaCalendarRace | null>(() => {
    const slug = this.raceSlug();
    const cal = this.calendar();
    if (!cal.length) return null;
    return findRaceBySlug(cal, slug);
  });

  // OpenF1 sessions that belong to the routed race weekend. Match strategy:
  //   1. Exact locality match (race.locality === session.location)
  //   2. Substring locality match (e.g. Jolpica "Miami" vs OpenF1 "Miami
  //      Gardens", or vice versa)
  //   3. Country-only fallback — safe only when the country hosts a single
  //      weekend per year (e.g. Monaco where locality differs:
  //      "Monte-Carlo" vs "Monaco"). Skipped when ambiguous.
  private weekendSessions = computed<OpenF1Session[]>(() => {
    const sessions = this.sessions();
    const race     = this.currentRace();
    if (!sessions.length || !race) return [];
    const raceLocality = norm(race.locality || '');
    const raceCountry  = norm(race.country  || '');

    if (raceLocality) {
      const exact = sessions.filter(s => norm(s.location || '') === raceLocality);
      if (exact.length) return exact;
      const partial = sessions.filter(s => {
        const sLoc = norm(s.location || '');
        if (!sLoc) return false;
        return sLoc.includes(raceLocality) || raceLocality.includes(sLoc);
      });
      if (partial.length) return partial;
    }

    if (!raceCountry) return [];
    const byCountry = sessions.filter(s => norm(s.countryName || '') === raceCountry);
    // Avoid ambiguous country-only matches when the country hosts more than
    // one circuit (would otherwise mix sessions from different meetings).
    const meetingKeys = new Set(byCountry.map(s => s.meetingKey));
    if (meetingKeys.size > 1) return [];
    return byCountry;
  });

  // SessionKey of whichever weekend session is happening right now, or null.
  liveSessionKey = computed<SessionKey | null>(() => {
    const weekend = this.weekendSessions();
    if (!weekend.length) return null;
    const nowMs = this.now().getTime();
    const live = weekend.find(s => {
      const start = Date.parse(s.dateStart);
      const end   = Date.parse(s.dateEnd);
      return Number.isFinite(start) && Number.isFinite(end) && nowMs >= start && nowMs <= end;
    });
    if (!live) return null;
    return OPENF1_SESSION_TO_KEY[live.sessionName] ?? null;
  });

  isSessionLive = computed(() => this.liveSessionKey() === this.sessionKey());

  // Session tabs to render. Always include the regular weekend layout; add
  // 'qualy-sprint' / 'sprint' only if the OpenF1 sessions for this weekend
  // confirm those sessions exist. Falls back to non-sprint defaults while
  // sessions are still loading to avoid a flicker for the common case.
  availableSessions = computed<SessionKey[]>(() => {
    const weekend = this.weekendSessions();
    if (!weekend.length) {
      return SESSION_ORDER.filter(k => k !== 'qualy-sprint' && k !== 'sprint');
    }
    const present = new Set<SessionKey>();
    for (const s of weekend) {
      const k = OPENF1_SESSION_TO_KEY[s.sessionName];
      if (k) present.add(k);
    }
    const hasSprint = present.has('sprint') || present.has('qualy-sprint');
    return SESSION_ORDER.filter(k => {
      if (k === 'qualy-sprint' || k === 'sprint') return hasSprint;
      return true;
    });
  });

  // Resolves the OpenF1 session_key for the routed (race, sessionKey) pair.
  // Returns null when sessions haven't loaded yet, or the meeting is in the
  // future (no OpenF1 entry exists), or the calendar race can't be matched.
  openF1SessionKey = computed<number | null>(() => {
    const weekend = this.weekendSessions();
    if (!weekend.length) return null;
    const wantedNames = SESSION_KEY_TO_OPENF1_NAMES[this.sessionKey()] ?? [];
    if (!wantedNames.length) return null;
    const match = weekend.find(s => wantedNames.includes(s.sessionName));
    return match?.sessionKey ?? null;
  });

  raceStatus = computed<'upcoming' | 'live' | 'done' | 'unknown'>(() => {
    const race = this.currentRace();
    if (!race) return 'unknown';
    const raceTime = race.time ?? '23:59:59Z';
    const raceDate = new Date(`${race.date}T${raceTime}`);
    if (!Number.isFinite(raceDate.getTime())) return 'unknown';
    const now = this.now();
    const diffHours = (raceDate.getTime() - now.getTime()) / 3_600_000;
    if (diffHours > 0.5) return 'upcoming';
    if (diffHours < -3) return 'done';
    return 'live';
  });

  notFound = computed(() =>
    !this.loading() && this.calendar().length > 0 && !this.currentRace()
  );

  totalRounds = computed(() => {
    const cal = this.calendar();
    return cal.length ? Math.max(...cal.map(r => r.round)) : 24;
  });

  liveHeaderData = computed(() => {
    const race = this.currentRace();
    const total = this.totalRounds();
    return {
      raceName: race?.raceName ?? 'Gran Premio',
      circuitName: race?.circuitName ?? '—',
      locality: race?.locality ?? '—',
      country: race?.country ?? '',
      round: race?.round ?? 0,
      totalRounds: total,
    };
  });

  // ── Derived timing data ──
  latestLapByDriver = computed(() => {
    const map = new Map<number, OpenF1Lap>();
    for (const lap of this.laps()) {
      const ex = map.get(lap.driverNumber);
      if (!ex || lap.lapNumber > ex.lapNumber) map.set(lap.driverNumber, lap);
    }
    return map;
  });

  bestLapByDriver = computed(() => {
    const map = new Map<number, OpenF1Lap>();
    for (const lap of this.laps()) {
      if (lap.lapDuration === null) continue;
      const ex = map.get(lap.driverNumber);
      if (!ex || ex.lapDuration === null || lap.lapDuration < ex.lapDuration) {
        map.set(lap.driverNumber, lap);
      }
    }
    return map;
  });

  latestIntervalByDriver = computed(() => {
    const map = new Map<number, OpenF1Interval>();
    for (const intv of this.intervals()) {
      const ex = map.get(intv.driverNumber);
      if (!ex || intv.date > ex.date) map.set(intv.driverNumber, intv);
    }
    return map;
  });

  currentStintByDriver = computed(() => {
    const map = new Map<number, OpenF1Stint>();
    for (const s of this.stints()) {
      const ex = map.get(s.driverNumber);
      if (!ex || s.stintNumber > ex.stintNumber) map.set(s.driverNumber, s);
    }
    return map;
  });

  currentLap = computed<number | null>(() => {
    const l = this.laps();
    if (!l.length) return null;
    return Math.max(...l.map(x => x.lapNumber));
  });

  totalLapsDisplay = computed(() => {
    const lastR = this.lastRace();
    if (!lastR?.results?.length) return '—';
    const winner = lastR.results.find(r => r.position === 1);
    return winner?.laps ? String(winner.laps) : '—';
  });

  elapsedDisplay = computed(() => {
    const dur = this.sessionConfig().durationMinutes;
    const h = Math.floor(dur / 60);
    const m = dur % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  });

  timingRows = computed<TimingDriver[]>(() => {
    const drivers = this.openF1Drivers();
    if (!drivers.length) return [];
    const latestPos = new Map<number, number>();
    for (const p of this.positions()) latestPos.set(p.driverNumber, p.position);
    const latestLap = this.latestLapByDriver();
    const bestLap = this.bestLapByDriver();
    const latestIntv = this.latestIntervalByDriver();
    const currStint = this.currentStintByDriver();
    return drivers
      .map((d, i) => {
        const pos = latestPos.get(d.driverNumber) ?? 99;
        const color = d.teamColour ? `#${d.teamColour}` : (TEAM_COLORS[d.teamName] ?? '#888888');
        const lap = latestLap.get(d.driverNumber);
        const best = bestLap.get(d.driverNumber);
        const intv = latestIntv.get(d.driverNumber);
        const stint = currStint.get(d.driverNumber);
        const gap = this.fmtGap(intv?.gapToLeader ?? null, pos);
        const ivl = this.fmtInterval(intv?.interval ?? null, pos);
        const ll = this.fmtLap(lap?.lapDuration ?? null);
        const bl = this.fmtLap(best?.lapDuration ?? null);
        const s1 = this.fmtSector(lap?.durationSector1 ?? null);
        const s2 = this.fmtSector(lap?.durationSector2 ?? null);
        const s3 = this.fmtSector(lap?.durationSector3 ?? null);
        const isPB = lap && best && lap.lapNumber === best.lapNumber;
        const sc: SectorColor = isPB ? 'sec-yellow' : 'sec-white';
        const compound = stint?.compound?.toUpperCase() ?? '';
        const tire: TireType = COMPOUND_MAP[compound] ?? TIRE_CYCLE[i % TIRE_CYCLE.length];
        const lapNum = lap?.lapNumber ?? 0;
        const tyreAge = (stint?.lapStart && lapNum > 0) ? lapNum - stint.lapStart + 1 : 0;
        const speed = lap?.stSpeed ?? lap?.i2Speed ?? 0;
        return {
          pos, num: d.driverNumber,
          name: this.fmtBroadcastName(d.broadcastName),
          short: d.nameAcronym,
          team: d.teamName, teamColor: color,
          gap, interval: ivl,
          lastLap: ll, bestLap: bl,
          tire, tyreAge,
          laps: lapNum, drs: false,
          s1, s2, s3,
          s1c: s1 === '—' ? 'sec-white' : sc,
          s2c: s2 === '—' ? 'sec-white' : sc,
          s3c: s3 === '—' ? 'sec-white' : sc,
          speed: speed ?? 0,
        } as TimingDriver;
      })
      .sort((a, b) => a.pos - b.pos || a.num - b.num);
  });

  tickerDrivers = computed(() => this.timingRows().slice(0, 10));

  driverStandingsDisplay = computed<DriverStandingDisplay[]>(() =>
    this.driverStands().map(d => ({
      pos: d.pos,
      short: this.lastNameAbbrev(d.driver),
      name: d.driver,
      points: d.points,
      teamColor: this.getTeamColor(d.team),
    }))
  );

  constructorStandingsDisplay = computed<ConstructorStandingDisplay[]>(() =>
    this.constructorStands().map(c => ({
      pos: c.pos,
      name: c.team,
      points: c.points,
      color: this.getTeamColor(c.team),
    }))
  );

  activeStandings = computed(() => {
    const tab = this.standingsTab();
    if (tab === 'drivers') {
      const list = this.driverStandingsDisplay();
      const max = Math.max(...list.map(d => d.points), 1);
      return list.map(d => ({ pos: d.pos, label: d.short, color: d.teamColor, points: d.points, widthPct: (d.points / max) * 100 }));
    }
    const list = this.constructorStandingsDisplay();
    const max = Math.max(...list.map(c => c.points), 1);
    return list.map(c => ({ pos: c.pos, label: c.name, color: c.color, points: c.points, widthPct: (c.points / max) * 100 }));
  });

  currentWeather = computed(() => this.weather());

  raceControlFeed = computed(() => {
    const rc = this.raceControl();
    const tr = this.teamRadio();
    const drivers = this.openF1Drivers();
    const acronymMap = new Map<number, string>(drivers.map(d => [d.driverNumber, d.nameAcronym]));
    type Sortable = RadioMessage & { _date: string };
    const all: Sortable[] = [
      ...rc.filter(r => r.message?.trim()).map(r => ({
        _date: r.date, time: this.fmtFeedTime(r.date),
        type: 'control' as const, from: 'Race Control', msg: r.message!,
        urgent: r.flag === 'RED' || r.category === 'SafetyCar',
      })),
      ...tr.map(t => ({
        _date: t.date, time: this.fmtFeedTime(t.date),
        type: 'radio' as const, from: acronymMap.get(t.driverNumber) ?? `#${t.driverNumber}`,
        msg: 'Team radio available',
      })),
    ];
    return all.sort((a, b) => b._date.localeCompare(a._date)).slice(0, 25).map(({ _date, ...rest }) => rest);
  });

  filteredRadio = computed<RadioMessage[]>(() => {
    const feed = this.raceControlFeed();
    const f = this.radioFilter();
    return f === 'all' ? feed : feed.filter(m => m.type === f);
  });

  statusBadges = computed(() => {
    if (!this.isSessionLive()) {
      const status = this.raceStatus();
      if (status === 'done') return [{ label: 'FINALIZADA', variant: 'grey' as const }];
      return [{ label: 'PROGRAMADA', variant: 'grey' as const }];
    }
    const badges: { label: string; variant: 'green' | 'grey' | 'yellow' }[] = [{ label: 'SC STANDBY', variant: 'grey' }];
    const flagsBySector = new Map<number, OpenF1RaceControl>();
    const sortedDesc = [...this.raceControl()].filter(m => m.category === 'Flag' && m.sector != null)
      .sort((a, b) => b.date.localeCompare(a.date));
    for (const m of sortedDesc) {
      if (!flagsBySector.has(m.sector!)) flagsBySector.set(m.sector!, m);
    }
    const yellowSectors = [...flagsBySector.entries()]
      .filter(([, m]) => m.flag === 'YELLOW')
      .map(([sector]) => sector)
      .sort((a, b) => a - b);
    for (const sector of yellowSectors) {
      badges.push({ label: `YELLOW: SECTOR ${sector}`, variant: 'yellow' });
    }
    return badges;
  });

  private animFrameId: number | null = null;
  private mapProgress = 0;

  // Refetch session-specific data whenever the resolved OpenF1 session_key
  // changes (route → race or session swap, or sessions list arrived later).
  private readonly sessionDataEffect = effect(() => {
    const key = this.openF1SessionKey();
    this.loadSessionData(key);
  });

  ngOnInit(): void {
    this.loadAll();
    interval(1_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.now.set(new Date()));
    interval(10_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.isSessionLive()) return;
      const key = this.openF1SessionKey();
      this.service.getPositions(key).subscribe({ next: p => this.positions.set(p), error: () => {} });
      this.service.getIntervals(key).subscribe({ next: i => this.intervals.set(i), error: () => {} });
    });
    interval(15_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.isSessionLive()) return;
      this.service.getLaps(this.openF1SessionKey()).subscribe({ next: l => this.laps.set(l), error: () => {} });
    });
    interval(60_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.isSessionLive()) return;
      this.service.getWeather(this.openF1SessionKey()).subscribe({ next: w => this.weather.set(w), error: () => {} });
    });
    interval(30_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.isSessionLive()) return;
      const key = this.openF1SessionKey();
      this.service.getRaceControl(key).subscribe({ next: r => this.raceControl.set(r), error: () => {} });
      this.service.getTeamRadio(key).subscribe({ next: t => this.teamRadio.set(t), error: () => {} });
      this.service.getStints(key).subscribe({ next: s => this.stints.set(s), error: () => {} });
    });
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
  }

  setStandingsTab(t: 'drivers' | 'constructors'): void { this.standingsTab.set(t); }
  setRadioFilter(f: 'all' | 'radio' | 'control'): void { this.radioFilter.set(f); }

  pad(n: number): string { return String(Math.floor(n)).padStart(2, '0'); }
  windDirStr(deg: number): string {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16] || 'N';
  }
  today(): string { return new Date().toLocaleDateString('es-ES'); }

  buildSessionLink(session: SessionKey): (string | number)[] {
    return ['/f1/calendario', this.raceSlug(), session];
  }

  private loadAll(): void {
    this.loading.set(true); this.error.set(null);
    this.service.getCalendar().subscribe({
      next: c => {
        this.calendar.set(c);
        this.loading.set(false);
        setTimeout(() => this.startMapAnimation(), 80);
      },
      error: () => this.loading.set(false),
    });
    this.service.getDriverStandings().subscribe({ next: d => this.driverStands.set(d), error: () => {} });
    this.service.getConstructorStandings().subscribe({ next: c => this.constructorStands.set(c), error: () => {} });
    this.service.getLastRace().subscribe({ next: r => this.lastRace.set(r), error: () => {} });
    this.service.getSessions().subscribe({ next: s => this.sessions.set(s), error: () => {} });
  }

  // Reloads every per-session OpenF1 dataset for the resolved session_key.
  // Called when the route resolves to a new session OR when the sessions list
  // becomes available (effect below). Clears everything if no key is found.
  //
  // Each response is guarded by re-checking the current openF1SessionKey()
  // before writing the signal. Without this, fast tab switches leave many
  // requests in flight and the last-resolved response wins — making all
  // tabs appear to share the same data.
  private loadSessionData(key: number | null): void {
    if (key === null) {
      this.openF1Drivers.set([]);
      this.positions.set([]);
      this.weather.set(null);
      this.laps.set([]);
      this.intervals.set([]);
      this.stints.set([]);
      this.raceControl.set([]);
      this.teamRadio.set([]);
      this.locations.set([]);
      return;
    }
    const stillCurrent = () => this.openF1SessionKey() === key;
    this.service.getDrivers(key).subscribe({
      next: d => stillCurrent() && this.openF1Drivers.set(d),
      error: () => {},
    });
    this.service.getPositions(key).subscribe({
      next: p => stillCurrent() && this.positions.set(p),
      error: () => {},
    });
    this.service.getWeather(key).subscribe({
      next: w => stillCurrent() && this.weather.set(w),
      error: () => {},
    });
    this.service.getLaps(key).subscribe({
      next: l => stillCurrent() && this.laps.set(l),
      error: () => {},
    });
    this.service.getIntervals(key).subscribe({
      next: i => stillCurrent() && this.intervals.set(i),
      error: () => {},
    });
    this.service.getStints(key).subscribe({
      next: s => stillCurrent() && this.stints.set(s),
      error: () => {},
    });
    this.service.getRaceControl(key).subscribe({
      next: r => stillCurrent() && this.raceControl.set(r),
      error: () => {},
    });
    this.service.getTeamRadio(key).subscribe({
      next: t => stillCurrent() && this.teamRadio.set(t),
      error: () => {},
    });
    this.service.getLocation(1, key).subscribe({
      next: l => {
        if (!stillCurrent()) return;
        this.locations.set(l);
        if (this.animFrameId !== null) { cancelAnimationFrame(this.animFrameId); this.animFrameId = null; }
        setTimeout(() => this.startMapAnimation(), 0);
      },
      error: () => {},
    });
  }

  private buildCircuitPath(): [number, number][] {
    const race = this.currentRace();
    const candidate = race?.circuitName || race?.locality || '';
    const official = findOfficialCircuit(candidate);
    if (official && official.coords.length >= 30) {
      const projected = projectCircuitCoords(official.coords);
      if (projected.length >= 30) return projected;
    }
    return FALLBACK_PATH;
  }

  private startMapAnimation(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);

    const W = canvas.width;
    const H = canvas.height;
    const path = this.buildCircuitPath();
    const minX = Math.min(...path.map(p => p[0]));
    const maxX = Math.max(...path.map(p => p[0]));
    const minY = Math.min(...path.map(p => p[1]));
    const maxY = Math.max(...path.map(p => p[1]));
    const dx = Math.max(maxX - minX, 1);
    const dy = Math.max(maxY - minY, 1);
    const scale = Math.min((W - 40) / dx, (H - 40) / dy) * 0.85;
    const offX = (W - dx * scale) / 2 - minX * scale;
    const offY = (H - dy * scale) / 2 - minY * scale;
    const tp: [number, number][] = path.map(([x, y]) => [x * scale + offX, y * scale + offY]);

    const FRAME_INTERVAL_MS = 50;
    let lastFrameTs = -Infinity;
    let frame = 0;
    const draw = (now: number = performance.now()) => {
      if (now - lastFrameTs < FRAME_INTERVAL_MS) { this.animFrameId = requestAnimationFrame(draw); return; }
      lastFrameTs = now;
      const rows = this.timingRows();
      const hideDots = !this.isSessionLive();
      const colors = rows.length > 0 ? rows.map(d => d.teamColor) : FALLBACK_DOT_COLORS;
      const names = rows.length > 0 ? rows.map(d => d.short) : FALLBACK_DOT_NAMES;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, W, H);
      try {
        const grad = (ctx as any).createConicGradient(frame * 0.02, W / 2, H / 2);
        grad.addColorStop(0, '#FFD10000');
        grad.addColorStop(0.08, '#FFD10025');
        grad.addColorStop(0.12, '#FFD10000');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.max(W, H), 0, Math.PI * 2); ctx.fill();
      } catch {}
      [0.2, 0.4, 0.6, 0.8, 1.0].forEach(r => {
        ctx.beginPath(); ctx.arc(W / 2, H / 2, r * Math.min(W, H) * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,209,0,${Math.max(0, 0.10 - r * 0.06)})`; ctx.lineWidth = 0.5; ctx.stroke();
      });
      ctx.strokeStyle = 'rgba(255,209,0,0.10)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
      ctx.beginPath(); tp.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.strokeStyle = '#FFD10055'; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.beginPath(); tp.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.strokeStyle = '#FFD100'; ctx.lineWidth = 2; ctx.stroke();
      const total = tp.length;
      if (total === 0 || hideDots) {
        this.mapProgress = (this.mapProgress + 0.12) % 100;
        frame++;
        this.animFrameId = requestAnimationFrame(draw);
        return;
      }
      const N = colors.length;
      for (let di = 0; di < N; di++) {
        const off = di / N;
        const rawIdx = ((this.mapProgress / 100 + off) % 1) * total;
        const idx = Math.floor(rawIdx) % total;
        const next = (idx + 1) % total;
        const t = rawIdx - Math.floor(rawIdx);
        const px = tp[idx][0] + (tp[next][0] - tp[idx][0]) * t;
        const py = tp[idx][1] + (tp[next][1] - tp[idx][1]) * t;
        const color = colors[di];
        if (!isFinite(px) || !isFinite(py)) continue;
        if (di < 3) {
          const grd = ctx.createRadialGradient(px, py, 0, px, py, 8);
          grd.addColorStop(0, color + '99'); grd.addColorStop(1, color + '00');
          ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(px, py, di === 0 ? 4.5 : 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.stroke();
        if (di === 0) {
          ctx.fillStyle = '#1a1a1a';
          ctx.font = '700 9px "Barlow Condensed"';
          ctx.fillText(names[di], px + 7, py - 5);
        }
      }
      this.mapProgress = (this.mapProgress + 0.12) % 100;
      frame++;
      this.animFrameId = requestAnimationFrame(draw);
    };
    this.zone.runOutsideAngular(() => draw());
  }

  // ── Formatters ──
  private fmtLap(secs: number | null): string {
    if (secs === null || secs <= 0) return '—';
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toFixed(3).padStart(6, '0');
    return `${m}:${s}`;
  }
  private fmtSector(secs: number | null): string {
    if (secs === null || secs <= 0) return '—';
    return secs.toFixed(3);
  }
  private fmtGap(gap: number | string | null, pos: number): string {
    if (pos === 1) return 'LÍDER';
    if (gap === null || gap === undefined) return '—';
    if (typeof gap === 'string') return gap.trim() || '—';
    if (typeof gap !== 'number' || !isFinite(gap)) return '—';
    return `+${gap.toFixed(3)}s`;
  }
  private fmtInterval(intv: number | string | null, pos: number): string {
    if (pos === 1) return '—';
    if (intv === null || intv === undefined) return '—';
    if (typeof intv === 'string') return intv.trim() || '—';
    if (typeof intv !== 'number' || !isFinite(intv)) return '—';
    return `+${intv.toFixed(3)}s`;
  }
  private fmtFeedTime(isoDate: string): string {
    if (!isoDate) return '—';
    try {
      const d = new Date(isoDate);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    } catch { return '—'; }
  }
  private fmtBroadcastName(name: string): string {
    if (!name) return '—';
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    const last = parts.slice(1).map(p => p.length > 0 ? p[0] + p.slice(1).toLowerCase() : '').join(' ');
    return `${parts[0]}.  ${last}`;
  }
  private lastNameAbbrev(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1].slice(0, 3).toUpperCase();
  }
  private getTeamColor(team: string): string { return TEAM_COLORS[team] ?? '#888888'; }
}
