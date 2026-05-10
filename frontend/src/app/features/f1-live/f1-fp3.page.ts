import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, NgZone, OnDestroy, OnInit, signal, ViewChild, ViewEncapsulation, } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { F1LiveService } from './f1-live.service';
import { findOfficialCircuit, projectCircuitCoords } from './official-circuits';
import type { ConstructorStandingDisplay, DriverStandingDisplay, JolpikaCalendarRace, JolpikaConstructorStanding, JolpikaDriverStanding, JolpikaLastRace, OpenF1Driver, OpenF1Interval, OpenF1Lap, OpenF1Location, OpenF1Position, OpenF1RaceControl, OpenF1Session, OpenF1Stint, OpenF1TeamRadio, OpenF1Weather, RadioMessage, SectorColor, TimingDriver, TireType, } from './f1-live.types';

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

const TIRE_CYCLE: TireType[] = ['m','m','h','m','h','s','h','m','h','s','m','h','s','m','h','s','m','h','s','m'];

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

const FALLBACK_DOT_COLORS = ['#FFD100','#E8002D','#FF8000','#27F4D2','#64C4FF'];
const FALLBACK_DOT_NAMES  = ['P1','P2','P3','P4','P5'];

const SESSION_NAME_MAP: Record<string, string> = {
  'Practice 1':      'FP1',
  'Practice 2':      'FP2',
  'Practice 3':      'FP3',
  'Qualifying':      'QUALY',
  'Sprint':          'SPRINT',
  'Sprint Shootout': 'QUALY',
  'Race':            'RACE',
};

const COMPOUND_MAP: Record<string, TireType> = { SOFT: 's', MEDIUM: 'm', HARD: 'h', INTERMEDIATE: 'i', WET: 'w', };

const SESSION_LABEL = 'FP3';
const DURATION_MINUTES = 60; // FP3 = 1 hour

@Component({
  selector: 'app-f1-fp3-page',
  standalone: true,
  imports: [NgClass, RouterLink],
  templateUrl: './f1-fp3.page.html',
  styleUrl: './f1-fp1.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class F1Fp3PageComponent implements OnInit, OnDestroy {
  @ViewChild('mapCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  private readonly service    = inject(F1LiveService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone       = inject(NgZone);

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

  activeSession = signal(SESSION_LABEL);
  standingsTab  = signal<'drivers' | 'constructors'>('drivers');
  radioFilter   = signal<'all' | 'radio' | 'control'>('all');
  now           = signal(new Date());

  latestLapByDriver = computed(() => { const map = new Map<number, OpenF1Lap>(); for (const lap of this.laps()) { const ex = map.get(lap.driverNumber); if (!ex || lap.lapNumber > ex.lapNumber) map.set(lap.driverNumber, lap); } return map; });

  bestLapByDriver = computed(() => { const map = new Map<number, OpenF1Lap>(); for (const lap of this.laps()) { if (lap.lapDuration === null) continue; const ex = map.get(lap.driverNumber); if (!ex || ex.lapDuration === null || lap.lapDuration < ex.lapDuration) { map.set(lap.driverNumber, lap); } } return map; });

  latestIntervalByDriver = computed(() => { const map = new Map<number, OpenF1Interval>(); for (const intv of this.intervals()) { const ex = map.get(intv.driverNumber); if (!ex || intv.date > ex.date) map.set(intv.driverNumber, intv); } return map; });

  currentStintByDriver = computed(() => { const map = new Map<number, OpenF1Stint>(); for (const s of this.stints()) { const ex = map.get(s.driverNumber); if (!ex || s.stintNumber > ex.stintNumber) map.set(s.driverNumber, s); } return map; });

  totalRounds = computed(() => { const cal = this.calendar(); return cal.length ? Math.max(...cal.map(r => r.round)) : 24; });

  currentRace = computed<JolpikaCalendarRace | null>(() => { const lastR = this.lastRace(); const cal = this.calendar(); if (lastR && cal.length) { return cal.find(r => r.round === lastR.round) ?? null; } if (!cal.length) return null; const today = new Date().toISOString().slice(0, 10); const upcoming = cal.filter(r => r.date >= today); return upcoming.length ? upcoming[0] : cal[cal.length - 1]; });

  liveHeaderData = computed(() => { const race = this.currentRace(); const total = this.totalRounds(); return { raceName: race?.raceName ?? 'Gran Premio', circuitName: race?.circuitName ?? '—', locality: race?.locality ?? '—', round: race?.round ?? 0, totalRounds: total, }; });

  currentLap = computed<number | null>(() => { const l = this.laps(); if (!l.length) return null; return Math.max(...l.map(x => x.lapNumber)); });

  totalLapsDisplay = computed(() => { const lastR = this.lastRace(); if (!lastR?.results?.length) return '—'; const winner = lastR.results.find(r => r.position === 1); return winner?.laps ? String(winner.laps) : '—'; });

  elapsedDisplay = computed(() => {
    const sess = this.sessions().find(s => SESSION_NAME_MAP[s.sessionName] === SESSION_LABEL);
    if (sess?.dateStart) {
      try {
        const start = new Date(sess.dateStart).getTime();
        const now = this.now().getTime();
        const durMs = DURATION_MINUTES * 60 * 1000;
        let elapsedMs = Math.max(0, now - start);
        if (elapsedMs > durMs) elapsedMs = durMs;
        const hrs = Math.floor(elapsedMs / 3600000);
        const mins = Math.floor((elapsedMs % 3600000) / 60000);
        const secs = Math.floor((elapsedMs % 60000) / 1000);
        return `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
      } catch {}
    }
    const h = Math.floor(DURATION_MINUTES / 60);
    const m = DURATION_MINUTES % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
  });

  // simplified: reuse timingRows from fp1/fp2 logic
  timingRows = computed<TimingDriver[]>(() => []);

  ngOnInit(): void {
    this.loadAll();
    interval(1_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.now.set(new Date()));
  }

  ngOnDestroy(): void {}

  private loadAll(): void {
    this.loading.set(true); this.error.set(null);
    this.service.getDrivers().subscribe({ next: d => { this.openF1Drivers.set(d); this.loading.set(false); }, error: () => this.loading.set(false), });
    this.service.getSessions().subscribe({ next: s => this.sessions.set(s), error: () => {}, });
  }

}
