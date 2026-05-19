import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, interval, of } from 'rxjs';
import {
  Category,
  CategoryData,
  CountdownTime,
  Driver,
  Constructor,
  Favorite,
  FLAG_MAP,
  LastRace,
  NewsItem,
  NextRace,
  PodiumEntry,
  Session,
  SUB_CATEGORIES,
} from '../../data/sports.data';
import { HomeService } from './services/home.service';
import { F1LiveService } from '../f1-live/f1-live.service';
import { NewsService } from '../news/news.service';
import { sessionsForRaceWeekend } from '../f1-live/f1-weekend-sessions';
import { slugifyRace } from '../race/race-slug';
import type {
  JolpikaCalendarRace,
  JolpikaConstructorStanding,
  JolpikaDriverStanding,
  JolpikaLastRace,
  OpenF1Session,
} from '../f1-live/f1-live.types';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { RaceCardComponent } from '../../shared/components/race-card/race-card.component';
import { StandingsTableComponent } from '../../shared/components/standings-table/standings-table.component';
import { NewsListComponent } from '../../shared/components/news-list/news-list.component';
import { RightRailComponent } from '../../shared/components/right-rail/right-rail.component';
import { ReturnNavDirective } from '../../core/directives/return-nav.directive';
import { NewsImageComponent } from '../news/news-image/news-image.component';
import { F1_SIDEBAR_SECTION_LABELS } from '../../shared/f1-sidebar-sections';
// ── Team color & nationality lookups ──────────────────────────────────────
const TEAM_COLORS: Record<string, string> = {
  'mercedes':           '#27F4D2',
  'red bull':           '#3671C6',
  'red bull racing':    '#3671C6',
  'ferrari':            '#E8002D',
  'mclaren':            '#FF8000',
  'aston martin':       '#358C75',
  'alpine':             '#0093CC',
  'alpine f1 team':     '#0093CC',
  'williams':           '#64C4FF',
  'haas':               '#B6BABD',
  'haas f1 team':       '#B6BABD',
  'rb':                 '#6692FF',
  'rb f1 team':         '#6692FF',
  'racing bulls':       '#6692FF',
  'kick sauber':        '#52E252',
  'sauber':             '#52E252',
  'audi':               '#E5002B',
  'cadillac f1 team':   '#C0C0C0',
};

// Jolpika returns ISO 3166-1 alpha-3 codes for some endpoints; FLAG_MAP keys
// are alpha-2. This translates the most common 2026 grid nationalities.
const NATIONALITY_TO_CC: Record<string, string> = {
  'British': 'GB', 'Dutch': 'NL', 'Spanish': 'ES', 'Monegasque': 'MC',
  'Australian': 'AU', 'French': 'FR', 'Italian': 'IT', 'Mexican': 'MX',
  'Japanese': 'JP', 'Thai': 'TH', 'Canadian': 'CA', 'German': 'DE',
  'Finnish': 'FI', 'Danish': 'DK', 'Chinese': 'CN', 'American': 'US',
  'New Zealander': 'NZ', 'Argentine': 'AR', 'Brazilian': 'BR',
};

const SESSION_LABELS: Record<string, string> = {
  'Practice 1':      'FP1',
  'Practice 2':      'FP2',
  'Practice 3':      'FP3',
  'Qualifying':      'QUALY',
  'Sprint':          'SPRINT',
  'Sprint Shootout': 'SPRINT Q',
  'Sprint Qualifying': 'SPRINT Q',
  'Race':            'RACE',
};

const REFRESH_LIVE_MS  = 30_000;
const REFRESH_IDLE_MS  = 5 * 60_000;

const normalize = (s: string) => (s || '').toLowerCase().trim();
const teamColor = (team: string) => TEAM_COLORS[normalize(team)] ?? '#888888';
const lastNameInitial = (full: string): string => {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return full;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
};

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgStyle,
    RouterLink,
    TopbarComponent,
    SidebarComponent,
    RaceCardComponent,
    StandingsTableComponent,
    NewsListComponent,
    RightRailComponent,
    NewsImageComponent,
    ReturnNavDirective,
  ],
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly homeService = inject(HomeService);
  private readonly f1          = inject(F1LiveService);
  private readonly newsService = inject(NewsService);
  private readonly destroyRef  = inject(DestroyRef);

  readonly flagMap         = FLAG_MAP;
  readonly sidebarSections = [...F1_SIDEBAR_SECTION_LABELS];

  categories        = signal<Category[]>([]);
  activeCat         = signal('f1');
  loading           = signal(true);
  error             = signal<string | null>(null);
  countdown         = signal<CountdownTime>({ d: 0, h: 0, m: 0, s: 0 });
  now               = signal(new Date());

  // ── Raw real-data signals ──
  private calendarRaces = signal<JolpikaCalendarRace[]>([]);
  private driverStands  = signal<JolpikaDriverStanding[]>([]);
  private teamStands    = signal<JolpikaConstructorStanding[]>([]);
  private lastRaceRaw   = signal<JolpikaLastRace | null>(null);
  private sessionsRaw   = signal<OpenF1Session[]>([]);
  private newsRaw       = signal<NewsItem[]>([]);
  // ── Derived ──
  currentCat = computed(
    () => this.categories().find(c => c.id === this.activeCat()) ?? this.categories()[0],
  );
  accent = computed(() => this.currentCat()?.accent ?? '#FFD100');

  // Sidebar shows the series belonging to the active top-level category.
  sidebarCategories = computed<Category[]>(
    () => SUB_CATEGORIES[this.activeCat()] ?? SUB_CATEGORIES['f1'],
  );

  private nextRaceRaw = computed<JolpikaCalendarRace | null>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.calendarRaces().find(r => r.date >= today) ?? null;
  });

  private nextMeetingSessions = computed<OpenF1Session[]>(() => {
    const race = this.nextRaceRaw();
    if (!race) return [];
    return sessionsForRaceWeekend(this.sessionsRaw(), race);
  });

  // The session currently within its time window (if any).
  liveSession = computed<OpenF1Session | null>(() => {
    const now = this.now().getTime();
    for (const s of this.sessionsRaw()) {
      const start = new Date(s.dateStart).getTime();
      const end   = new Date(s.dateEnd).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end) {
        return s;
      }
    }
    return null;
  });

  liveBannerVisible = computed(() => this.bannerDismissed() ? false : this.liveSession() !== null);
  bannerDismissed   = signal(false);

  // ── Adapter to CategoryData shape for existing template ──
  data = computed<CategoryData>(() => ({
    nextRace:     this.buildNextRace(),
    standings:    this.buildStandings(),
    constructors: this.buildConstructors(),
    lastRace:     this.buildLastRace(),
    news:         this.buildNews(),
  }));

  hasData = computed(() =>
    this.calendarRaces().length > 0 ||
    this.driverStands().length > 0 ||
    this.lastRaceRaw() !== null,
  );

  featuredNews = computed(() => this.data().news[0] ?? null);

  seasonRoundsDone = computed(() => Math.max(0, this.data().nextRace.round - 1));
  seasonProgressPct = computed(() => {
    const total = this.data().nextRace.totalRounds || 1;
    return Math.round((this.seasonRoundsDone() / total) * 100);
  });

  seasonDotIndices = computed(() =>
    Array.from({ length: this.data().nextRace.totalRounds }, (_, i) => i),
  );

  lastRaceWinner = computed(
    () => this.data().lastRace.podium[0]?.driver ?? '—',
  );

  currentFavorites = computed((): Favorite[] =>
    this.data().standings.slice(0, 2).map(d => ({
      name: d.driver,
      sub: d.team,
      driverId: d.driverId,
    })),
  );

  maxConstructorPoints = computed(() => {
    const c = this.data().constructors;
    return c.length ? Math.max(...c.map(x => x.points)) : 1;
  });

  liveBannerData = computed(() => {
    const s = this.liveSession();
    const race = this.nextRaceRaw();
    if (!s || !race) return null;
    const label = SESSION_LABELS[s.sessionName] ?? s.sessionName.toUpperCase();
    return {
      sessionLabel: label,
      raceName: race.raceName,
      circuitName: race.circuitName,
    };
  });

  private countdownInterval?: ReturnType<typeof setInterval>;
  private refreshTimer?:      ReturnType<typeof setInterval>;
  private clockTimer?:        ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.homeService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: cats => this.categories.set(cats),
        error: () => {},
      });

    this.loadAll();
    this.startIntervals();
  }

  ngOnDestroy(): void {
    clearInterval(this.countdownInterval);
    clearInterval(this.refreshTimer);
    clearInterval(this.clockTimer);
  }

  setCat(id: string): void {
    this.activeCat.set(id);
    // Real-data wiring is F1-only; other categories will be added when their
    // data sources are connected.
  }

  // ── Loaders ─────────────────────────────────────────────────────────────
  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      calendar:     this.f1.getCalendar().pipe(catchError(() => of([] as JolpikaCalendarRace[]))),
      driverStands: this.f1.getDriverStandings().pipe(catchError(() => of([] as JolpikaDriverStanding[]))),
      teamStands:   this.f1.getConstructorStandings().pipe(catchError(() => of([] as JolpikaConstructorStanding[]))),
      lastRace:     this.f1.getLastRace().pipe(catchError(() => of(null as JolpikaLastRace | null))),
      sessions:     this.f1.getSessions().pipe(catchError(() => of([] as OpenF1Session[]))),
      news:         this.newsService.getFeed('f1', 'Todos', 6, 0).pipe(
        catchError(() => of({ items: [], total: 0, category: 'f1', tag: 'Todos', page: 1, pageSize: 6, totalPages: 1 })),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: r => {
          this.calendarRaces.set(r.calendar);
          this.driverStands.set(r.driverStands);
          this.teamStands.set(r.teamStands);
          this.lastRaceRaw.set(r.lastRace);
          this.sessionsRaw.set(r.sessions);
          this.newsRaw.set(
            r.news.items.map(a => ({
              id: a.id,
              tag: a.tag,
              title: a.title,
              time: a.time,
              hot: a.hot,
              imageUrl: a.imageUrl,
              cat: a.cat,
            })),
          );
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los datos. Revisa que el backend esté arrancado.');
          this.loading.set(false);
        },
      });
  }

  private startIntervals(): void {
    // Countdown — every second toward next race kickoff
    const updateCountdown = () => {
      const race = this.nextRaceRaw();
      if (!race) { this.countdown.set({ d: 0, h: 0, m: 0, s: 0 }); return; }
      const target = new Date(`${race.date}T${race.time ?? '00:00:00Z'}`).getTime();
      const diff = target - Date.now();
      if (diff <= 0) { this.countdown.set({ d: 0, h: 0, m: 0, s: 0 }); return; }
      this.countdown.set({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    updateCountdown();
    this.countdownInterval = setInterval(updateCountdown, 1000);

    // "now" clock — drives `liveSession` window detection
    this.clockTimer = setInterval(() => this.now.set(new Date()), 5_000);

    // Data refresh — fast during live session, slow otherwise
    interval(REFRESH_LIVE_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.liveSession()) this.refreshLiveData();
      });
    interval(REFRESH_IDLE_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshAll());
  }

  private refreshLiveData(): void {
    // During a live session, standings/last-race/calendar don't change — only
    // sessions metadata (which session is current) matters most.
    this.f1.getSessions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: s => this.sessionsRaw.set(s), error: () => {},
    });
  }

  private refreshAll(): void {
    this.f1.getCalendar().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: c => this.calendarRaces.set(c), error: () => {} });
    this.f1.getDriverStandings().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: d => this.driverStands.set(d), error: () => {} });
    this.f1.getConstructorStandings().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: t => this.teamStands.set(t), error: () => {} });
    this.f1.getLastRace().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: r => this.lastRaceRaw.set(r), error: () => {} });
    this.f1.getSessions().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: s => this.sessionsRaw.set(s), error: () => {} });
    this.newsService
      .getFeed('f1', 'Todos', 6, 0)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res =>
          this.newsRaw.set(
            res.items.map(a => ({
              id: a.id,
              tag: a.tag,
              title: a.title,
              time: a.time,
              hot: a.hot,
              imageUrl: a.imageUrl,
              cat: a.cat,
            })),
          ),
        error: () => {},
      });
  }

  dismissBanner(): void { this.bannerDismissed.set(true); }

  // ── Adapters: real API rows → CategoryData ──────────────────────────────
  private buildNextRace(): NextRace {
    const race = this.nextRaceRaw();
    const totalRounds = this.calendarRaces().length || 24;
    if (!race) {
      return {
        name: '—', circuit: '—', location: '—',
        date: new Date().toISOString(), round: 0,
        totalRounds, sessions: [],
      };
    }
    const dateIso = `${race.date}T${race.time ?? '00:00:00Z'}`;
    const sessions: Session[] = this.nextMeetingSessions()
      .map(s => {
        const start = new Date(s.dateStart);
        const label = SESSION_LABELS[s.sessionName] ?? s.sessionName.toUpperCase();
        return {
          name: label,
          date: new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
                  .format(start).replace('.', ''),
          time: new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' })
                  .format(start),
          highlight: label === 'RACE',
        };
      });
    return {
      name: race.raceName,
      circuit: race.circuitName,
      location: `${race.locality}, ${race.country}`,
      date: dateIso,
      round: race.round,
      totalRounds,
      sessions,
    };
  }

  private buildStandings(): Driver[] {
    return this.driverStands().map(d => ({
      pos: d.pos,
      driver: lastNameInitial(d.driver),
      team: d.team,
      points: d.points,
      nationality: NATIONALITY_TO_CC[d.nationality] ?? d.nationality?.slice(0, 2).toUpperCase() ?? '',
      teamColor: teamColor(d.team),
      driverId: d.driverId?.trim() || undefined,
    }));
  }

  private buildConstructors(): Constructor[] {
    return this.teamStands().map(t => ({
      pos: t.pos,
      team: t.team,
      points: t.points,
      color: teamColor(t.team),
      constructorId: t.constructorId?.trim() || undefined,
    }));
  }

  private buildLastRace(): LastRace {
    const r = this.lastRaceRaw();
    if (!r) {
      return { name: '—', date: '—', podium: [] };
    }
    const podium: PodiumEntry[] = (r.results ?? []).slice(0, 3).map(p => ({
      pos: p.position,
      driver: lastNameInitial(p.driver),
      time: p.time ?? '—',
      team: p.team,
      teamColor: teamColor(p.team),
    }));
    return {
      name: r.raceName,
      slug: slugifyRace({ raceName: r.raceName }),
      date: new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
              .format(new Date(r.date)),
      podium,
    };
  }

  private buildNews(): NewsItem[] {
    return this.newsRaw();
  }
}
