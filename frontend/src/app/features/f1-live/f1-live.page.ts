import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, interval, of } from 'rxjs';
import { F1LiveService } from './f1-live.service';
import type {
  ConstructorStandingDisplay,
  DriverStandingDisplay,
  JolpikaCalendarRace,
  JolpikaConstructorStanding,
  JolpikaDriverStanding,
  JolpikaLastRace,
  OpenF1Driver,
  OpenF1Position,
  OpenF1Weather,
  RadioMessage,
  SectorColor,
  TimingDriver,
  TireType,
} from './f1-live.types';

// ── Constants ─────────────────────────────────────────────────────────────

const TEAM_COLORS: Record<string, string> = {
  'Mercedes':          '#27F4D2',
  'Red Bull':          '#3671C6',
  'Red Bull Racing':   '#3671C6',
  'Ferrari':           '#E8002D',
  'McLaren':           '#FF8000',
  'Aston Martin':      '#358C75',
  'Alpine':            '#0093CC',
  'Alpine F1 Team':    '#0093CC',
  'Williams':          '#64C4FF',
  'Haas':              '#B6BABD',
  'Haas F1 Team':      '#B6BABD',
  'RB':                '#6692FF',
  'RB F1 Team':        '#6692FF',
  'Kick Sauber':       '#52E252',
  'Sauber':            '#52E252',
  'Audi':              '#E5002B',
  'Cadillac F1 Team':  '#C0C0C0',
};

const TIRE_CYCLE: TireType[] = ['m','m','h','m','h','s','h','m','h','s','m','h','s','m','h','s','m','h','s','m'];

const RADIO_FEED: RadioMessage[] = [
  { time: '45:12', type: 'radio',   from: 'Race Control', msg: 'VSC DEPLOYED - Safety Car standby', urgent: true },
  { time: '44:58', type: 'radio',   from: 'VER → BOX',    msg: 'Box box box. Switch to Hard.' },
  { time: '44:31', type: 'control', from: 'Race Control', msg: 'Track limits noted at Turn 8, Driver 16' },
  { time: '43:55', type: 'radio',   from: 'LEC → BOX',    msg: 'These tyres are completely gone, we need to stop.' },
  { time: '43:12', type: 'control', from: 'Race Control', msg: 'FASTEST LAP: VER 1:13.456 L42' },
  { time: '42:44', type: 'radio',   from: 'HAM → BOX',    msg: 'I feel understeer in high speed, check the settings' },
  { time: '41:58', type: 'control', from: 'Race Control', msg: 'Turn 8 track limit warning issued to Car 55' },
  { time: '41:22', type: 'radio',   from: 'NOR → BOX',    msg: 'Gap to P2, gap to P2. Push push push.' },
];

// Simplified Monaco circuit points for canvas animation
const MONACO_PATH: [number, number][] = [
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

const DOT_COLORS = ['#FFD100','#E8002D','#FF8000','#E8002D','#64C4FF'];
const DOT_NAMES  = ['VER','LEC','NOR','HAM','SAI'];

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

  // ── State signals ──────────────────────────────────────────────────────
  loading           = signal(true);
  error             = signal<string | null>(null);
  openF1Drivers     = signal<OpenF1Driver[]>([]);
  positions         = signal<OpenF1Position[]>([]);
  weather           = signal<OpenF1Weather | null>(null);
  driverStands      = signal<JolpikaDriverStanding[]>([]);
  constructorStands = signal<JolpikaConstructorStanding[]>([]);
  calendar          = signal<JolpikaCalendarRace[]>([]);
  lastRace          = signal<JolpikaLastRace | null>(null);
  activeSession     = signal('RACE');
  standingsTab      = signal<'drivers' | 'constructors'>('drivers');
  radioFilter       = signal<'all' | 'radio' | 'control'>('all');
  now               = signal(new Date());

  // ── Computed ───────────────────────────────────────────────────────────
  timingDrivers = computed<TimingDriver[]>(() => {
    const drivers   = this.openF1Drivers();
    const positions = this.positions();
    if (!drivers.length) return [];

    const latestPos = new Map<number, number>();
    for (const p of positions) {
      latestPos.set(p.driverNumber, p.position);
    }

    return drivers
      .map((d, i) => {
        const pos   = latestPos.get(d.driverNumber) ?? (i + 1);
        const color = d.teamColour ? `#${d.teamColour}` : '#888888';
        return {
          pos,
          num:      d.driverNumber,
          name:     this.formatBroadcastName(d.broadcastName),
          short:    d.nameAcronym,
          team:     d.teamName,
          teamColor: color,
          gap:      '—',
          interval: '—',
          lastLap:  '—',
          bestLap:  '—',
          tire:     TIRE_CYCLE[i % TIRE_CYCLE.length],
          laps:     0,
          drs:      false,
          s1: '—', s2: '—', s3: '—',
          s1c: 'sec-white' as SectorColor,
          s2c: 'sec-white' as SectorColor,
          s3c: 'sec-white' as SectorColor,
          speed: 0,
        } as TimingDriver;
      })
      .sort((a, b) => a.pos - b.pos);
  });

  tickerDrivers = computed(() => this.timingDrivers().slice(0, 10));

  driverStandingsDisplay = computed<DriverStandingDisplay[]>(() =>
    this.driverStands().slice(0, 5).map(d => ({
      pos:       d.pos,
      short:     this.lastNameAbbrev(d.driver),
      name:      d.driver,
      points:    d.points,
      teamColor: this.getTeamColor(d.team),
    }))
  );

  constructorStandingsDisplay = computed<ConstructorStandingDisplay[]>(() =>
    this.constructorStands().slice(0, 5).map(c => ({
      pos:    c.pos,
      name:   c.team,
      points: c.points,
      color:  this.getTeamColor(c.team),
    }))
  );

  maxStandingPoints = computed(() => {
    const tab = this.standingsTab();
    const pts = tab === 'drivers'
      ? this.driverStandingsDisplay().map(d => d.points)
      : this.constructorStandingsDisplay().map(c => c.points);
    return Math.max(...pts, 1);
  });

  filteredRadio = computed(() => {
    const f = this.radioFilter();
    if (f === 'all') return RADIO_FEED;
    return RADIO_FEED.filter(m => m.type === f);
  });

  currentWeather = computed(() => this.weather());

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

  trackDisplayName = computed(() => this.liveHeaderData().locality);

  // ── Readonly data ──────────────────────────────────────────────────────
  readonly SESSIONS  = ['FP1','FP2','FP3','QUALY','SPRINT','RACE'];
  readonly radioFeed = RADIO_FEED;
  readonly dotNames  = DOT_NAMES;
  readonly dotColors = DOT_COLORS;

  // Status badges: no real API endpoint provides live flags/DRS/SC state
  readonly STATUS_BADGES = [
    { label: 'DRS HABILITADO',   variant: 'green'  },
    { label: 'SC STANDBY',       variant: 'grey'   },
    { label: 'YELLOW: SECTOR 2', variant: 'yellow' },
  ] as const;

  // ── Canvas animation ───────────────────────────────────────────────────
  private animFrameId: number | null = null;
  private mapProgress = 0;

  // ── Lifecycle ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAll();

    interval(1_000).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(new Date()));

    interval(60_000).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.service.getWeather().subscribe({
        next: w => this.weather.set(w),
        error: () => {},
      }));

    interval(10_000).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.service.getPositions().subscribe({
        next: p => this.positions.set(p),
        error: () => {},
      }));
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  // ── Data loading ───────────────────────────────────────────────────────
  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      drivers:      this.service.getDrivers(),
      positions:    this.service.getPositions(),
      weather:      this.service.getWeather(),
      driverS:      this.service.getDriverStandings(),
      constructorS: this.service.getConstructorStandings(),
      calendar:     this.service.getCalendar(),
      lastRace:     this.service.getLastRace().pipe(catchError(() => of(null))),
    }).subscribe({
      next: r => {
        this.openF1Drivers.set(r.drivers);
        this.positions.set(r.positions);
        this.weather.set(r.weather);
        this.driverStands.set(r.driverS);
        this.constructorStands.set(r.constructorS);
        this.calendar.set(r.calendar);
        this.lastRace.set(r.lastRace);
        this.loading.set(false);
        setTimeout(() => this.startMapAnimation(), 80);
      },
      error: () => {
        this.error.set('No se puede conectar con el backend. Asegúrate de que está arrancado en localhost:3000.');
        this.loading.set(false);
      },
    });
  }

  // ── Canvas map ─────────────────────────────────────────────────────────
  private startMapAnimation(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);

    const W = canvas.width;
    const H = canvas.height;

    const minX = Math.min(...MONACO_PATH.map(p => p[0]));
    const maxX = Math.max(...MONACO_PATH.map(p => p[0]));
    const minY = Math.min(...MONACO_PATH.map(p => p[1]));
    const maxY = Math.max(...MONACO_PATH.map(p => p[1]));
    const scale  = Math.min((W - 40) / (maxX - minX), (H - 40) / (maxY - minY)) * 0.85;
    const offX   = (W - (maxX - minX) * scale) / 2 - minX * scale;
    const offY   = (H - (maxY - minY) * scale) / 2 - minY * scale;
    const tp: [number, number][] = MONACO_PATH.map(([x, y]) => [x * scale + offX, y * scale + offY]);

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#06060a';
      ctx.fillRect(0, 0, W, H);

      try {
        const grad = (ctx as any).createConicGradient(frame * 0.02, W / 2, H / 2);
        grad.addColorStop(0,    '#FFD10000');
        grad.addColorStop(0.08, '#FFD10012');
        grad.addColorStop(0.12, '#FFD10000');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, Math.max(W, H), 0, Math.PI * 2);
        ctx.fill();
      } catch {}

      [0.2, 0.4, 0.6, 0.8, 1.0].forEach(r => {
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, r * Math.min(W, H) * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,209,0,${Math.max(0, 0.04 - r * 0.03)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      ctx.strokeStyle = 'rgba(255,209,0,0.05)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

      ctx.beginPath();
      tp.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.strokeStyle = '#FFD10020';
      ctx.lineWidth = 7;
      ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.beginPath();
      tp.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.strokeStyle = '#FFD10055';
      ctx.lineWidth = 2;
      ctx.stroke();

      const total = tp.length;
      [0, 0.05, 0.10, 0.15, 0.20].forEach((off, di) => {
        const rawIdx = ((this.mapProgress / 100 + off) % 1) * total;
        const idx    = Math.floor(rawIdx) % total;
        const next   = (idx + 1) % total;
        const t      = rawIdx - Math.floor(rawIdx);
        const px     = tp[idx][0] + (tp[next][0] - tp[idx][0]) * t;
        const py     = tp[idx][1] + (tp[next][1] - tp[idx][1]) * t;
        const color  = DOT_COLORS[di];

        const grd = ctx.createRadialGradient(px, py, 0, px, py, 10);
        grd.addColorStop(0, color + 'aa');
        grd.addColorStop(1, color + '00');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, di === 0 ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();

        if (di === 0) {
          ctx.fillStyle = '#FFD100';
          ctx.font = '600 9px "Barlow Condensed"';
          ctx.fillText(DOT_NAMES[di], px + 7, py - 5);
        }
      });

      this.mapProgress = (this.mapProgress + 0.12) % 100;
      frame++;
      this.animFrameId = requestAnimationFrame(draw);
    };

    draw();
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  setSession(s: string): void { this.activeSession.set(s); }
  setStandingsTab(t: 'drivers' | 'constructors'): void { this.standingsTab.set(t); }
  setRadioFilter(f: 'all' | 'radio' | 'control'): void { this.radioFilter.set(f); }

  pad(n: number): string {
    return String(Math.floor(n)).padStart(2, '0');
  }

  windDirStr(deg: number): string {
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16] || 'N';
  }

  today(): string {
    return new Date().toLocaleDateString('es-ES');
  }

  trackByNum(_: number, d: TimingDriver): number { return d.num; }

  private formatBroadcastName(name: string): string {
    if (!name) return '—';
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    const initial = parts[0] + '.';
    const last    = parts.slice(1).map(p => p.length > 0 ? p[0] + p.slice(1).toLowerCase() : '').join(' ');
    return `${initial} ${last}`;
  }

  private lastNameAbbrev(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1].slice(0, 3).toUpperCase();
  }

  private getTeamColor(team: string): string {
    return TEAM_COLORS[team] ?? '#888888';
  }
}
