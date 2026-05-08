import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { F1LiveService } from './f1-live.service';
import { findOfficialCircuit, projectCircuitCoords } from './official-circuits';
import type {
  ConstructorStandingDisplay,
  DriverStandingDisplay,
  JolpikaCalendarRace,
  JolpikaConstructorStanding,
  JolpikaDriverStanding,
  JolpikaLastRace,
  OpenF1Driver,
  OpenF1Interval,
  OpenF1Lap,
  OpenF1Location,
  OpenF1Position,
  OpenF1RaceControl,
  OpenF1Session,
  OpenF1Stint,
  OpenF1TeamRadio,
  OpenF1Weather,
  RadioMessage,
  SectorColor,
  TimingDriver,
  TireType,
} from './f1-live.types';

// ── Constants ─────────────────────────────────────────────────────────────

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

// Fallback tire sequence when no stint data is available
const TIRE_CYCLE: TireType[] = ['m','m','h','m','h','s','h','m','h','s','m','h','s','m','h','s','m','h','s','m'];

// Generic circuit path for canvas visualization (Monaco shape — labelled as generic)
const CIRCUIT_PATH: [number, number][] = [
  [120,78],[128,70],[140,62],[152,58],[160,52],[172,48],[184,46],[196,46],
  [208,48],[218,54],[224,64],[222,76],[214,84],[202,88],[190,86],[180,80],
  [174,70],[178,60],[188,58],[198,64],[200,74],[192,80],[182,82],
  [172,86],[160,92],[148,100],[136,108],[124,116],[112,122],[100,126],
  [88,126],[76,122],[66,114],[62,102],[64,90],[70,80],[78,74],[88,72],
  [98,74],[108,80],[114,90],[112,100],[104,108],[96,116],[90,124],
  [100,130],[114,132],[128,130],[140,124],[148,116],[152,106],[158,98],
  [168,96],[180,98],[192,102],[204,106],[216,108],[228,108],[238,104],
  [244,98],[242,90],[236,86],[228,88],[224,96],[230,104],[240,108],
  [228,112],[214,116],[200,118],[186,118],[172,116],[158,114],[144,114],
  [132,116],[120,118],[108,116],[100,110],[96,100],[98,90],[106,84],[114,80],[120,78],
];

// Fallback dot data when no real drivers are available
const FALLBACK_DOT_COLORS = ['#FFD100','#E8002D','#FF8000','#27F4D2','#64C4FF'];
const FALLBACK_DOT_NAMES  = ['P1','P2','P3','P4','P5'];

// Map OpenF1 session names → our SESSIONS tab labels
const SESSION_NAME_MAP: Record<string, string> = {
  'Practice 1':      'FP1',
  'Practice 2':      'FP2',
  'Practice 3':      'FP3',
  'Qualifying':      'QUALY',
  'Sprint':          'SPRINT',
  'Sprint Shootout': 'QUALY',
  'Race':            'RACE',
};

// Map tyre compound string → TireType char
const COMPOUND_MAP: Record<string, TireType> = {
  SOFT: 's', MEDIUM: 'm', HARD: 'h', INTERMEDIATE: 'i', WET: 'w',
};

@Component({
  selector: 'app-f1-live-page',
  standalone: true,
  imports: [NgClass, RouterLink],
  templateUrl: './f1-live.page.html',
  styleUrl: './f1-live.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class F1LivePageComponent implements OnInit, OnDestroy {
  @ViewChild('mapCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  private readonly service    = inject(F1LiveService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone       = inject(NgZone);

  // ── Raw data signals ───────────────────────────────────────────────────
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

  // ── UI state signals ───────────────────────────────────────────────────
  activeSession = signal('RACE');
  standingsTab  = signal<'drivers' | 'constructors'>('drivers');
  radioFilter   = signal<'all' | 'radio' | 'control'>('all');
  now           = signal(new Date());

  // ── Per-driver index computeds ─────────────────────────────────────────

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

  // ── Session / race computed ────────────────────────────────────────────

  totalRounds = computed(() => {
    const cal = this.calendar();
    return cal.length ? Math.max(...cal.map(r => r.round)) : 24;
  });

  currentRace = computed<JolpikaCalendarRace | null>(() => {
    const lastR = this.lastRace();
    const cal   = this.calendar();
    if (lastR && cal.length) {
      return cal.find(r => r.round === lastR.round) ?? null;
    }
    if (!cal.length) return null;
    const today    = new Date().toISOString().slice(0, 10);
    const upcoming = cal.filter(r => r.date >= today);
    return upcoming.length ? upcoming[0] : cal[cal.length - 1];
  });

  liveHeaderData = computed(() => {
    const race  = this.currentRace();
    const total = this.totalRounds();
    return {
      raceName:    race?.raceName    ?? 'Gran Premio',
      circuitName: race?.circuitName ?? '—',
      locality:    race?.locality    ?? '—',
      round:       race?.round       ?? 0,
      totalRounds: total,
    };
  });

  // ── Lap / elapsed counters ─────────────────────────────────────────────

  currentLap = computed<number | null>(() => {
    const l = this.laps();
    if (!l.length) return null;
    return Math.max(...l.map(x => x.lapNumber));
  });

  // Total laps from last-race winner results (Jolpica). No endpoint = '—'
  totalLapsDisplay = computed(() => {
    const lastR = this.lastRace();
    if (!lastR?.results?.length) return '—';
    const winner = lastR.results.find(r => r.position === 1);
    return winner?.laps ? String(winner.laps) : '—';
  });

  // No real elapsed-time endpoint — always placeholder
  elapsedDisplay = computed(() => '--:--:--');

  // ── Main timing board computed ─────────────────────────────────────────

  timingRows = computed<TimingDriver[]>(() => {
    const drivers = this.openF1Drivers();
    if (!drivers.length) return [];

    const latestPos = new Map<number, number>();
    for (const p of this.positions()) latestPos.set(p.driverNumber, p.position);

    const latestLap  = this.latestLapByDriver();
    const bestLap    = this.bestLapByDriver();
    const latestIntv = this.latestIntervalByDriver();
    const currStint  = this.currentStintByDriver();

    return drivers
      .map((d, i) => {
        const pos   = latestPos.get(d.driverNumber) ?? 99;
        const color = d.teamColour ? `#${d.teamColour}` : (TEAM_COLORS[d.teamName] ?? '#888888');
        const lap   = latestLap.get(d.driverNumber);
        const best  = bestLap.get(d.driverNumber);
        const intv  = latestIntv.get(d.driverNumber);
        const stint = currStint.get(d.driverNumber);

        const gap  = this.fmtGap(intv?.gapToLeader ?? null, pos);
        const ivl  = this.fmtInterval(intv?.interval ?? null, pos);
        const ll   = this.fmtLap(lap?.lapDuration ?? null);
        const bl   = this.fmtLap(best?.lapDuration ?? null);
        const s1   = this.fmtSector(lap?.durationSector1 ?? null);
        const s2   = this.fmtSector(lap?.durationSector2 ?? null);
        const s3   = this.fmtSector(lap?.durationSector3 ?? null);

        // Highlight sector if current lap = best lap (personal best)
        const isPB = lap && best && lap.lapNumber === best.lapNumber;
        const sc: SectorColor = isPB ? 'sec-yellow' : 'sec-white';

        const compound  = stint?.compound?.toUpperCase() ?? '';
        const tire: TireType = COMPOUND_MAP[compound] ?? TIRE_CYCLE[i % TIRE_CYCLE.length];
        const lapNum    = lap?.lapNumber ?? 0;
        const tyreAge   = (stint?.lapStart && lapNum > 0) ? lapNum - stint.lapStart + 1 : 0;
        const speed     = lap?.stSpeed ?? lap?.i2Speed ?? 0;

        return {
          pos,
          num:       d.driverNumber,
          name:      this.fmtBroadcastName(d.broadcastName),
          short:     d.nameAcronym,
          team:      d.teamName,
          teamColor: color,
          gap, interval: ivl,
          lastLap: ll, bestLap: bl,
          tire, tyreAge,
          laps:  lapNum,
          drs:   false, // no DRS endpoint — centralized here
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

  // ── Standings computed ─────────────────────────────────────────────────

  driverStandingsDisplay = computed<DriverStandingDisplay[]>(() =>
    this.driverStands().map(d => ({
      pos:       d.pos,
      short:     this.lastNameAbbrev(d.driver),
      name:      d.driver,
      points:    d.points,
      teamColor: this.getTeamColor(d.team),
    }))
  );

  constructorStandingsDisplay = computed<ConstructorStandingDisplay[]>(() =>
    this.constructorStands().map(c => ({
      pos:    c.pos,
      name:   c.team,
      points: c.points,
      color:  this.getTeamColor(c.team),
    }))
  );

  /**
   * Unified standings list (precomputed with width%) used by a single @for
   * in the template — toggling drivers↔constructors just swaps the array
   * instead of destroying/recreating two separate @for subtrees.
   */
  activeStandings = computed<{
    pos: number;
    label: string;
    color: string;
    points: number;
    widthPct: number;
  }[]>(() => {
    const tab = this.standingsTab();
    if (tab === 'drivers') {
      const list = this.driverStandingsDisplay();
      const max = Math.max(...list.map(d => d.points), 1);
      return list.map(d => ({
        pos:      d.pos,
        label:    d.short,
        color:    d.teamColor,
        points:   d.points,
        widthPct: (d.points / max) * 100,
      }));
    }
    const list = this.constructorStandingsDisplay();
    const max = Math.max(...list.map(c => c.points), 1);
    return list.map(c => ({
      pos:      c.pos,
      label:    c.name,
      color:    c.color,
      points:   c.points,
      widthPct: (c.points / max) * 100,
    }));
  });

  currentWeather = computed(() => this.weather());

  // ── Race control feed ──────────────────────────────────────────────────

  raceControlFeed = computed<RadioMessage[]>(() => {
    const rc      = this.raceControl();
    const tr      = this.teamRadio();
    const drivers = this.openF1Drivers();

    const acronymMap = new Map<number, string>(
      drivers.map(d => [d.driverNumber, d.nameAcronym])
    );

    type Sortable = RadioMessage & { _date: string };

    const all: Sortable[] = [
      ...rc
        .filter(r => r.message?.trim())
        .map(r => ({
          _date:  r.date,
          time:   this.fmtFeedTime(r.date),
          type:   'control' as const,
          from:   'Race Control',
          msg:    r.message!,
          urgent: r.flag === 'RED' || r.category === 'SafetyCar',
        })),
      ...tr.map(t => ({
        _date: t.date,
        time:  this.fmtFeedTime(t.date),
        type:  'radio' as const,
        from:  acronymMap.get(t.driverNumber) ?? `#${t.driverNumber}`,
        msg:   'Team radio available',
      })),
    ];

    return all
      .sort((a, b) => b._date.localeCompare(a._date))
      .slice(0, 25)
      .map(({ _date, ...rest }) => rest);
  });

  filteredRadio = computed<RadioMessage[]>(() => {
    const feed = this.raceControlFeed();
    const f    = this.radioFilter();
    return f === 'all' ? feed : feed.filter(m => m.type === f);
  });

  // ── Canvas dot data (dynamic from real positions) ──────────────────────

  // Legend shows top 5 drivers — keeping it short so the canvas above isn't
  // pushed out by a long wrapped list. Canvas itself draws all 20 dots.
  dotNamesDisplay = computed(() => {
    const rows = this.timingRows();
    return rows.length >= 5
      ? rows.slice(0, 5).map(r => r.short)
      : [...FALLBACK_DOT_NAMES];
  });

  dotColorsDisplay = computed(() => {
    const rows = this.timingRows();
    return rows.length >= 5
      ? rows.slice(0, 5).map(r => r.teamColor)
      : [...FALLBACK_DOT_COLORS];
  });

  // ── Readonly UI data ───────────────────────────────────────────────────
  readonly SESSIONS = ['FP1','FP2','FP3','QUALY','SPRINT','RACE'];

  /**
   * Status badges shown next to ESTADO. SC STANDBY is the steady-state
   * indicator. Yellow-flag badges are derived live from the most recent
   * race-control flag message per sector — they only appear when a sector
   * is actively yellow and disappear once the same sector reports GREEN /
   * CLEAR. (DRS is removed from the F1 2026 regulations, so no DRS badge.)
   */
  statusBadges = computed<{ label: string; variant: 'green' | 'grey' | 'yellow' }[]>(() => {
    const badges: { label: string; variant: 'green' | 'grey' | 'yellow' }[] = [
      { label: 'SC STANDBY', variant: 'grey' },
    ];

    // Most recent flag message per sector
    const flagsBySector = new Map<number, OpenF1RaceControl>();
    const sortedDesc = [...this.raceControl()]
      .filter(m => m.category === 'Flag' && m.sector != null)
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

  // ── Canvas animation ───────────────────────────────────────────────────
  private animFrameId: number | null = null;
  private mapProgress = 0;

  // ── Lifecycle ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAll();

    // Clock tick
    interval(1_000).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(new Date()));

    // Positions + intervals every 10s
    interval(10_000).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.service.getPositions().subscribe({ next: p => this.positions.set(p), error: () => {} });
        this.service.getIntervals().subscribe({ next: i => this.intervals.set(i), error: () => {} });
      });

    // Laps every 15s
    interval(15_000).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() =>
        this.service.getLaps().subscribe({ next: l => this.laps.set(l), error: () => {} })
      );

    // Weather every 60s
    interval(60_000).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() =>
        this.service.getWeather().subscribe({ next: w => this.weather.set(w), error: () => {} })
      );

    // Race control + team radio + stints every 30s
    interval(30_000).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.service.getRaceControl().subscribe({ next: r => this.raceControl.set(r), error: () => {} });
        this.service.getTeamRadio().subscribe({ next: t => this.teamRadio.set(t), error: () => {} });
        this.service.getStints().subscribe({ next: s => this.stints.set(s), error: () => {} });
      });
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
  }

  // ── Initial load (progressive: each card renders as its data arrives) ──
  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    // Drivers + positions = "structural" data; once drivers arrive we hide
    // the loading skeleton because the timing tower can render its rows.
    this.service.getDrivers().subscribe({
      next: d => {
        this.openF1Drivers.set(d);
        this.loading.set(false);
        setTimeout(() => this.startMapAnimation(), 80);
      },
      error: () => this.loading.set(false),
    });

    this.service.getPositions().subscribe({
      next: p => this.positions.set(p),
      error: () => {},
    });

    this.service.getWeather().subscribe({
      next: w => this.weather.set(w),
      error: () => {},
    });

    this.service.getDriverStandings().subscribe({
      next: d => this.driverStands.set(d),
      error: () => {},
    });

    this.service.getConstructorStandings().subscribe({
      next: c => this.constructorStands.set(c),
      error: () => {},
    });

    this.service.getCalendar().subscribe({
      next: c => this.calendar.set(c),
      error: () => {},
    });

    this.service.getLastRace().subscribe({
      next: r => this.lastRace.set(r),
      error: () => {},
    });

    this.service.getSessions().subscribe({
      next: s => {
        this.sessions.set(s);
        if (s.length) {
          const latest = [...s].sort((a, b) => b.dateStart.localeCompare(a.dateStart))[0];
          this.activeSession.set(SESSION_NAME_MAP[latest.sessionName] ?? 'RACE');
        }
      },
      error: () => {},
    });

    this.service.getLaps().subscribe({
      next: l => this.laps.set(l),
      error: () => {},
    });

    this.service.getIntervals().subscribe({
      next: i => this.intervals.set(i),
      error: () => {},
    });

    this.service.getStints().subscribe({
      next: s => this.stints.set(s),
      error: () => {},
    });

    this.service.getRaceControl().subscribe({
      next: r => this.raceControl.set(r),
      error: () => {},
    });

    this.service.getTeamRadio().subscribe({
      next: t => this.teamRadio.set(t),
      error: () => {},
    });

    // Real circuit outline from one driver's telemetry. We pick driver #1
    // as a sensible default; if missing we fall back to the static path.
    this.service.getLocation(1).subscribe({
      next: l => {
        this.locations.set(l);
        // Restart animation so the new path takes effect immediately.
        if (this.animFrameId !== null) {
          cancelAnimationFrame(this.animFrameId);
          this.animFrameId = null;
        }
        setTimeout(() => this.startMapAnimation(), 0);
      },
      error: () => {},
    });
  }

  /**
   * Build the circuit outline. Source priority:
   *  1. Official outline from bacinger/f1-circuits (matched by current race
   *     circuitName / locality). Pixel-perfect when available.
   *  2. Telemetry-derived path: spatial grid over the driver's /location
   *     samples, keeping only cells visited many times (= racing line).
   *  3. Static fallback path.
   */
  private buildCircuitPath(): [number, number][] {
    // ── 1. Try the official circuit outline first ──────────────────────
    const race = this.currentRace();
    const candidate = race?.circuitName || race?.locality || '';
    const official = findOfficialCircuit(candidate);
    if (official && official.coords.length >= 30) {
      const projected = projectCircuitCoords(official.coords);
      if (projected.length >= 30) return projected;
    }

    // ── 2. Fall back to telemetry-derived path ─────────────────────────
    const raw = this.locations();
    if (raw.length < 600) return CIRCUIT_PATH;

    const valid = raw.filter(l =>
      isFinite(l.x) && isFinite(l.y) && (l.x !== 0 || l.y !== 0)
    );
    if (valid.length < 600) return CIRCUIT_PATH;

    const xs = valid.map(p => p.x);
    const ys = valid.map(p => p.y);
    const rangeX = Math.max(...xs) - Math.min(...xs);
    const rangeY = Math.max(...ys) - Math.min(...ys);
    if (rangeX < 500 || rangeY < 500) return CIRCUIT_PATH;

    // Aim for ~400 cells; auto-size based on circuit extent.
    const TARGET_CELLS = 400;
    const cellSize = Math.max(40, Math.sqrt((rangeX * rangeY) / TARGET_CELLS));

    interface Cell { x: number; y: number; tFirst: number; count: number; }
    const cells = new Map<string, Cell>();
    for (let i = 0; i < valid.length; i++) {
      const l = valid[i];
      const cx = Math.round(l.x / cellSize);
      const cy = Math.round(l.y / cellSize);
      const key = `${cx},${cy}`;
      const existing = cells.get(key);
      if (existing) {
        existing.count++;
      } else {
        cells.set(key, { x: l.x, y: l.y, tFirst: i, count: 1 });
      }
    }

    // Filter out cells that were rarely visited (pit lane, off-track moments,
    // formation lap detours). Threshold = 25% of the median visit count of
    // the most-visited cells, which adapts to session length.
    const counts = [...cells.values()].map(c => c.count).sort((a, b) => b - a);
    const reference = counts[Math.floor(counts.length * 0.5)] || 1;
    const minVisits = Math.max(5, Math.floor(reference * 0.4));
    const racingLine = [...cells.values()].filter(c => c.count >= minVisits);

    if (racingLine.length < 50) {
      // Not enough cells survived the filter — fall back to all cells, in
      // case this session has too few laps for the heuristic to apply.
      const fallback = [...cells.values()].sort((a, b) => a.tFirst - b.tFirst);
      const path: [number, number][] = fallback.map(p => [p.x, -p.y]);
      path.push(path[0]);
      return path.length >= 30 ? path : CIRCUIT_PATH;
    }

    const ordered = racingLine.sort((a, b) => a.tFirst - b.tFirst);
    const path: [number, number][] = ordered.map(p => [p.x, -p.y]);
    path.push(path[0]);
    return path;
  }

  // ── Canvas map ─────────────────────────────────────────────────────────
  // Runs entirely outside Angular's NgZone so requestAnimationFrame doesn't
  // trigger a change-detection cycle every frame. Without this, a 60fps loop
  // = 60 CD passes per second over the whole template, making clicks (e.g.
  // PILOTOS/CONSTRUCTORES toggle) feel sluggish.
  private startMapAnimation(): void {
    const canvas = this.canvasRef?.nativeElement;
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
    const offX  = (W - dx * scale) / 2 - minX * scale;
    const offY  = (H - dy * scale) / 2 - minY * scale;
    const tp: [number, number][] = path.map(([x, y]) => [x * scale + offX, y * scale + offY]);

    // Throttle to ~20fps — saves CPU on a decorative animation that doesn't
    // need to be smooth. Initialise lastFrameTs to -Infinity so the first
    // call draws immediately (otherwise the map appears blank for a moment).
    const FRAME_INTERVAL_MS = 50;
    let lastFrameTs = -Infinity;
    let frame = 0;
    const draw = (now: number = performance.now()) => {
      if (now - lastFrameTs < FRAME_INTERVAL_MS) {
        this.animFrameId = requestAnimationFrame(draw);
        return;
      }
      lastFrameTs = now;

      // Read all current drivers each frame (signal read is cached — no perf issue)
      const rows   = this.timingRows();
      const colors = rows.length > 0 ? rows.map(d => d.teamColor) : FALLBACK_DOT_COLORS;
      const names  = rows.length > 0 ? rows.map(d => d.short)     : FALLBACK_DOT_NAMES;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, W, H);

      try {
        const grad = (ctx as any).createConicGradient(frame * 0.02, W / 2, H / 2);
        grad.addColorStop(0,    '#FFD10000');
        grad.addColorStop(0.08, '#FFD10025');
        grad.addColorStop(0.12, '#FFD10000');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, Math.max(W, H), 0, Math.PI * 2);
        ctx.fill();
      } catch {}

      [0.2, 0.4, 0.6, 0.8, 1.0].forEach(r => {
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, r * Math.min(W, H) * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,209,0,${Math.max(0, 0.10 - r * 0.06)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      ctx.strokeStyle = 'rgba(255,209,0,0.10)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

      ctx.beginPath();
      tp.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.strokeStyle = '#FFD10055';
      ctx.lineWidth = 7;
      ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.beginPath();
      tp.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.strokeStyle = '#FFD100';
      ctx.lineWidth = 2;
      ctx.stroke();

      const total = tp.length;
      if (total === 0) {
        this.animFrameId = requestAnimationFrame(draw);
        return;
      }

      // Place every driver on the track. They're spaced uniformly around
      // the lap by 1/N, then the whole pack drifts together via mapProgress.
      // The leader gets a slightly bigger dot + label.
      const N = colors.length;
      for (let di = 0; di < N; di++) {
        const off = di / N;
        const rawIdx = ((this.mapProgress / 100 + off) % 1) * total;
        const idx    = Math.floor(rawIdx) % total;
        const next   = (idx + 1) % total;
        const t      = rawIdx - Math.floor(rawIdx);
        const px     = tp[idx][0] + (tp[next][0] - tp[idx][0]) * t;
        const py     = tp[idx][1] + (tp[next][1] - tp[idx][1]) * t;
        const color  = colors[di];

        if (!isFinite(px) || !isFinite(py)) continue;

        // Subtle glow only on the top 3 — keeps things visually clean with 20+ dots.
        if (di < 3) {
          const grd = ctx.createRadialGradient(px, py, 0, px, py, 8);
          grd.addColorStop(0, color + '99');
          grd.addColorStop(1, color + '00');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, di === 0 ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();

        // White stroke for contrast against the yellow track.
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Label only the leader.
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

    // Run RAF loop outside Angular's zone — RAF is patched by zone.js, so
    // without this every frame would trigger global change detection.
    this.zone.runOutsideAngular(() => draw());
  }

  // ── Template helpers ───────────────────────────────────────────────────
  setSession(s: string): void { this.activeSession.set(s); }
  setStandingsTab(t: 'drivers' | 'constructors'): void { this.standingsTab.set(t); }
  setRadioFilter(f: 'all' | 'radio' | 'control'): void { this.radioFilter.set(f); }

  pad(n: number): string { return String(Math.floor(n)).padStart(2, '0'); }

  windDirStr(deg: number): string {
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16] || 'N';
  }

  today(): string { return new Date().toLocaleDateString('es-ES'); }

  // ── Private formatters ─────────────────────────────────────────────────

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

  // OpenF1 returns gap_to_leader / interval as a number (seconds) for cars
  // on the lead lap, or a string like "1 LAP" / "+1 LAP" for lapped cars.
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
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
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

  private getTeamColor(team: string): string {
    return TEAM_COLORS[team] ?? '#888888';
  }
}
