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
import { Router, RouterLink } from '@angular/router';
import { catchError, filter, interval, of } from 'rxjs';
import {
  mergeHybridSources,
  startHybridLoad,
} from '../../core/profile/hybrid-dashboard.helpers';
import { NavigationEnd } from '@angular/router';
import {
  Category,
  CategoryData,
  HEADER_CATEGORIES,
  CountdownTime,
  Driver,
  Constructor,
  FLAG_MAP,
  LastRace,
  NewsItem,
  NextRace,
  PodiumEntry,
  Session,
} from '../../data/sports.data';
import { HomeSeriesCacheService, type HomeSeriesSnapshot } from './services/home-series-cache.service';
import { F1LiveService } from '../f1-live/f1-live.service';
import type { DataSource } from '../../core/data-source';
import { DataSourceBadgeComponent } from '../../shared/components/data-source-badge/data-source-badge.component';
import { MotogpPulseService } from '../motogp/motogp-pulse.service';
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
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { RaceCardComponent } from '../../shared/components/race-card/race-card.component';
import { StandingsTableComponent } from '../../shared/components/standings-table/standings-table.component';
import { NewsListComponent } from '../../shared/components/news-list/news-list.component';
import { RightRailComponent } from '../../shared/components/right-rail/right-rail.component';
import { ReturnNavDirective } from '../../core/directives/return-nav.directive';
import { NewsImageComponent } from '../news/news-image/news-image.component';
import { SeriesContextService } from '../../core/series/series-context.service';
import { homePathForSeries } from '../../core/series/series.config';
import type { SeriesId } from '../../core/series/series.types';
import { isMotoCategory } from '../../core/series/series-moto';
import { accentForeground, accentPodiumHighlight } from '../../core/series/series-accent.utils';
import { teamColor as resolveTeamColor } from '../drivers/drivers-shared';
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
const teamColor = (team: string, apiColor?: string | null) => resolveTeamColor(team, apiColor);
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
    AppSidebarComponent,
    RaceCardComponent,
    StandingsTableComponent,
    NewsListComponent,
    RightRailComponent,
    NewsImageComponent,
    ReturnNavDirective,
    DataSourceBadgeComponent,
  ],
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly seriesCache = inject(HomeSeriesCacheService);
  private readonly f1          = inject(F1LiveService);
  private readonly motogpPulse = inject(MotogpPulseService);
  private readonly newsService = inject(NewsService);
  private readonly destroyRef  = inject(DestroyRef);
  private readonly router      = inject(Router);
  readonly seriesCtx           = inject(SeriesContextService);

  readonly flagMap         = FLAG_MAP;
  readonly categories = HEADER_CATEGORIES;
  loading           = signal(true);
  refreshing        = signal(false);
  error             = signal<string | null>(null);
  dataSource        = signal<DataSource | null>(null);
  countdown         = signal<CountdownTime>({ d: 0, h: 0, m: 0, s: 0 });
  now               = signal(new Date());

  // ── Raw real-data signals ──
  private calendarRaces = signal<JolpikaCalendarRace[]>([]);
  private driverStands  = signal<JolpikaDriverStanding[]>([]);
  private teamStands    = signal<JolpikaConstructorStanding[]>([]);
  private lastRaceRaw   = signal<JolpikaLastRace | null>(null);
  private sessionsRaw   = signal<OpenF1Session[]>([]);
  private motogpLiveActive = signal(false);
  private motogpLiveHead = signal<{ sessionLabel: string; raceName: string; circuitName: string } | null>(null);
  private newsRaw       = signal<NewsItem[]>([]);
  // ── Derived ──
  /** Pestaña activa del header (solo F1 / MotoGP). */
  topbarActiveCat = computed(() =>
    this.seriesCtx.id() === 'motogp' ? 'motogp' : 'f1',
  );

  rightRailActiveCat = computed(() =>
    this.seriesCtx.id() === 'motogp' ? 'motogp' : this.seriesCtx.id(),
  );

  currentCat = computed(() => {
    const cfg = this.seriesCtx.config();
    return { id: cfg.id, label: cfg.label, short: cfg.short, accent: cfg.accent };
  });

  accent = computed(() => this.seriesCtx.config().accent);
  accentFg = computed(() => accentForeground(this.accent()));
  accentPodium = computed(() => accentPodiumHighlight(this.accent()));

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

  liveBannerVisible = computed(() => {
    if (!this.seriesCtx.config().features.livePage) return false;
    if (this.bannerDismissed()) return false;
    if (this.seriesCtx.id() === 'motogp') return this.motogpLiveActive();
    return this.liveSession() !== null;
  });
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

  /** Solo bloquea el contenido central; el header y sidebar siguen visibles. */
  showMainLoading = computed(() => this.loading() && !this.hasData());

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

  maxConstructorPoints = computed(() => {
    const c = this.data().constructors;
    return c.length ? Math.max(...c.map(x => x.points)) : 1;
  });

  liveBannerData = computed(() => {
    if (this.seriesCtx.id() === 'motogp') return this.motogpLiveHead();
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
  private loadedSeries: SeriesId | null = null;

  ngOnInit(): void {
    this.ensureSeriesData();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.ensureSeriesData());

    this.startIntervals();
  }

  private ensureSeriesData(): void {
    const sid = this.seriesCtx.id();
    if (sid === this.loadedSeries && !this.loading()) return;
    this.loadedSeries = sid;
    this.loadAll();
  }

  ngOnDestroy(): void {
    clearInterval(this.countdownInterval);
    clearInterval(this.refreshTimer);
    clearInterval(this.clockTimer);
  }

  setCat(id: string): void {
    if (id === 'motogp') {
      void this.router.navigateByUrl('/motogp');
      return;
    }
    if (isMotoCategory(id)) {
      void this.router.navigate(id === 'motogp' ? ['/motogp', 'noticias'] : [`/${id}`, 'noticias']);
      return;
    }
    const seriesId = id as SeriesId;
    if (seriesId !== 'f1' && seriesId !== 'f2' && seriesId !== 'f3') return;
    if (seriesId === this.seriesCtx.id()) return;
    void this.router.navigateByUrl(homePathForSeries(seriesId));
  }

  seriesLink(...segments: (string | number)[]): (string | number)[] {
    return this.seriesCtx.path(...segments.map(String));
  }

  seriesUrl(...segments: string[]): string {
    return this.seriesCtx.urlPath(...segments);
  }

  // ── Loaders ─────────────────────────────────────────────────────────────
  private applySnapshot(snapshot: HomeSeriesSnapshot): void {
    this.calendarRaces.set(snapshot.calendar);
    this.driverStands.set(snapshot.driverStands);
    this.teamStands.set(snapshot.teamStands);
    this.lastRaceRaw.set(snapshot.lastRace);
    this.sessionsRaw.set(snapshot.sessions);
    this.newsRaw.set(snapshot.news);
  }

  private clearSeriesSignals(): void {
    this.calendarRaces.set([]);
    this.driverStands.set([]);
    this.teamStands.set([]);
    this.lastRaceRaw.set(null);
    this.sessionsRaw.set([]);
    this.newsRaw.set([]);
  }

  private newsFeedLoad(seriesId: SeriesId) {
    return this.newsService.getFeed(seriesId, 'Todos', 6, 0).pipe(
      catchError(() =>
        of({
          items: [],
          total: 0,
          category: seriesId,
          tag: 'Todos',
          page: 1,
          pageSize: 6,
          totalPages: 1,
        }),
      ),
    );
  }

  private mapNewsItems(
    items: Array<{
      id?: string;
      tag: string;
      title: string;
      time: string;
      hot?: boolean;
      imageUrl?: string | null;
      cat?: string;
    }>,
  ): NewsItem[] {
    return items.map((a) => ({
      id: a.id,
      tag: a.tag,
      title: a.title,
      time: a.time,
      hot: a.hot,
      imageUrl: a.imageUrl,
      cat: a.cat,
    }));
  }

  private buildSnapshotFromSignals(): HomeSeriesSnapshot {
    return {
      calendar: this.calendarRaces(),
      driverStands: this.driverStands(),
      teamStands: this.teamStands(),
      lastRace: this.lastRaceRaw(),
      sessions: this.sessionsRaw(),
      news: this.newsRaw(),
    };
  }

  private runSeriesHybridLoad(seriesId: SeriesId, hadCache: boolean): void {
    const pulse = seriesId === 'motogp';

    const streams =
      pulse
        ? [
            {
              load: () =>
                this.motogpPulse.getCalendar().pipe(catchError(() => of([] as JolpikaCalendarRace[]))),
              onValue: (calendar: unknown) =>
                this.calendarRaces.set(calendar as JolpikaCalendarRace[]),
            },
            {
              load: () =>
                this.motogpPulse.getDriverStandingsResponse().pipe(
                  catchError(() =>
                    of({ items: [] as JolpikaDriverStanding[], source: undefined }),
                  ),
                ),
              onValue: (res: unknown) => {
                const r = res as { items?: JolpikaDriverStanding[] };
                this.driverStands.set(r.items ?? []);
              },
            },
            {
              load: () =>
                this.motogpPulse
                  .getTeamStandings()
                  .pipe(catchError(() => of([] as JolpikaConstructorStanding[]))),
              onValue: (teams: unknown) =>
                this.teamStands.set(teams as JolpikaConstructorStanding[]),
            },
            {
              load: () =>
                this.motogpPulse
                  .getLastRace()
                  .pipe(catchError(() => of(null as JolpikaLastRace | null))),
              onValue: (lr: unknown) =>
                this.lastRaceRaw.set(lr as JolpikaLastRace | null),
            },
            {
              load: () => this.newsFeedLoad(seriesId),
              onValue: (feed: unknown) => {
                const f = feed as {
                  items: Array<{
                    id?: string;
                    tag: string;
                    title: string;
                    time: string;
                    hot?: boolean;
                    imageUrl?: string | null;
                    cat?: string;
                  }>;
                };
                this.newsRaw.set(this.mapNewsItems(f.items));
              },
            },
          ]
        : [
            {
              load: () =>
                this.f1
                  .getCalendar(seriesId)
                  .pipe(catchError(() => of([] as JolpikaCalendarRace[]))),
              onValue: (calendar: unknown) =>
                this.calendarRaces.set(calendar as JolpikaCalendarRace[]),
            },
            {
              load: () =>
                this.f1.getDriverStandingsResponse(false, seriesId).pipe(
                  catchError(() =>
                    of({ items: [] as JolpikaDriverStanding[], source: undefined }),
                  ),
                ),
              onValue: (res: unknown) => {
                const r = res as { items?: JolpikaDriverStanding[] };
                this.driverStands.set(r.items ?? []);
              },
            },
            {
              load: () =>
                this.f1.getConstructorStandingsResponse(false, seriesId).pipe(
                  catchError(() =>
                    of({ items: [] as JolpikaConstructorStanding[], source: undefined }),
                  ),
                ),
              onValue: (res: unknown) => {
                const r = res as { items?: JolpikaConstructorStanding[] };
                this.teamStands.set(r.items ?? []);
              },
            },
            {
              load: () =>
                this.f1
                  .getLastRace(seriesId)
                  .pipe(catchError(() => of(null as JolpikaLastRace | null))),
              onValue: (lr: unknown) =>
                this.lastRaceRaw.set(lr as JolpikaLastRace | null),
            },
            {
              load: () => this.newsFeedLoad(seriesId),
              onValue: (feed: unknown) => {
                const f = feed as {
                  items: Array<{
                    id?: string;
                    tag: string;
                    title: string;
                    time: string;
                    hot?: boolean;
                    imageUrl?: string | null;
                    cat?: string;
                  }>;
                };
                this.newsRaw.set(this.mapNewsItems(f.items));
              },
            },
          ];

    if (!hadCache && !this.loading()) {
      this.refreshing.set(true);
    }

    startHybridLoad(streams, {
      isActive: () => this.seriesCtx.id() === seriesId,
      onReady: () => {
        this.loading.set(false);
        this.error.set(null);
      },
      onSources: (sources) => this.dataSource.set(mergeHybridSources(sources)),
      onAllSettled: () => {
        if (this.seriesCtx.id() !== seriesId) return;
        this.seriesCache.set(seriesId, this.buildSnapshotFromSignals());
        this.refreshing.set(false);
        this.loadSessionsInBackground(seriesId);
        if (seriesId === 'motogp') this.refreshLiveData();
      },
    });
  }

  /** OpenF1 / Pulse sessions en segundo plano (no bloquean el home). */
  private loadSessionsInBackground(seriesId: SeriesId): void {
    const sessions$ =
      seriesId === 'motogp'
        ? this.motogpPulse.getSessions().pipe(catchError(() => of([] as OpenF1Session[])))
        : this.f1.getSessions(seriesId).pipe(catchError(() => of([] as OpenF1Session[])));
    sessions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((sessions) => {
        if (this.seriesCtx.id() !== seriesId) return;
        this.sessionsRaw.set(sessions);
      });
  }

  private loadAll(): void {
    const seriesId = this.seriesCtx.id();
    const cached = this.seriesCache.get(seriesId);

    this.error.set(null);

    if (cached) {
      this.applySnapshot(cached);
      this.loading.set(false);
      this.refreshing.set(true);
    } else if (!this.hasData()) {
      this.loading.set(true);
      this.refreshing.set(false);
    } else {
      this.loading.set(false);
      this.refreshing.set(true);
    }

    this.runSeriesHybridLoad(seriesId, Boolean(cached));
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
        if (this.liveSession() || (this.seriesCtx.id() === 'motogp' && this.motogpLiveActive())) {
          this.refreshLiveData();
        }
      });
    interval(REFRESH_IDLE_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshAll());
  }

  private refreshLiveData(): void {
    const seriesId = this.seriesCtx.id();
    if (seriesId === 'motogp') {
      this.motogpPulse.getLiveTiming().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (lt) => {
          if (this.seriesCtx.id() !== 'motogp') return;
          const active = lt.active && lt.head != null;
          this.motogpLiveActive.set(active);
          if (active && lt.head) {
            this.motogpLiveHead.set({
              sessionLabel: lt.head.sessionShortName || 'LIVE',
              raceName: lt.head.eventName || 'MotoGP',
              circuitName: lt.head.circuitName || '—',
            });
          } else {
            this.motogpLiveHead.set(null);
          }
        },
        error: () => {
          this.motogpLiveActive.set(false);
          this.motogpLiveHead.set(null);
        },
      });
      return;
    }
    this.f1.getSessions(seriesId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (s) => {
        if (this.seriesCtx.id() !== seriesId) return;
        this.sessionsRaw.set(s);
      },
      error: () => {},
    });
  }

  private refreshAll(): void {
    const seriesId = this.seriesCtx.id();
    const pulse = seriesId === 'motogp';

    (pulse ? this.motogpPulse.getCalendar() : this.f1.getCalendar(seriesId))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          if (this.seriesCtx.id() === seriesId) this.calendarRaces.set(c);
        },
        error: () => {},
      });
    (pulse ? this.motogpPulse.getDriverStandings() : this.f1.getDriverStandings(false, seriesId))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          if (this.seriesCtx.id() === seriesId) this.driverStands.set(d);
        },
        error: () => {},
      });
    (pulse ? this.motogpPulse.getTeamStandings() : this.f1.getConstructorStandings(false, seriesId))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (t) => {
          if (this.seriesCtx.id() === seriesId) {
            this.teamStands.set(t as JolpikaConstructorStanding[]);
          }
        },
        error: () => {},
      });
    (pulse ? this.motogpPulse.getLastRace() : this.f1.getLastRace(seriesId))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          if (this.seriesCtx.id() === seriesId) this.lastRaceRaw.set(r);
        },
        error: () => {},
      });
    (pulse ? this.motogpPulse.getSessions() : this.f1.getSessions(seriesId))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          if (this.seriesCtx.id() === seriesId) this.sessionsRaw.set(s);
        },
        error: () => {},
      });
    this.newsService
      .getFeed(this.seriesCtx.id(), 'Todos', 6, 0)
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
      circuitSvgUrl: race.circuitSvgUrl ?? null,
      circuitImageUrl: race.circuitImageUrl ?? null,
    };
  }

  private buildStandings(): Driver[] {
    return this.driverStands().map(d => ({
      pos: d.pos,
      driver: lastNameInitial(d.driver),
      team: d.team,
      points: d.points,
      nationality: NATIONALITY_TO_CC[d.nationality] ?? d.nationality?.slice(0, 2).toUpperCase() ?? '',
      teamColor: teamColor(d.team, d.teamColor),
      driverId: d.driverId?.trim() || undefined,
    }));
  }

  private buildConstructors(): Constructor[] {
    return this.teamStands().map(t => ({
      pos: t.pos,
      team: t.team,
      points: t.points,
      color: teamColor(t.team, t.teamColor),
      constructorId: t.constructorId?.trim() || undefined,
    }));
  }

  private buildLastRace(): LastRace {
    const r = this.lastRaceRaw();
    if (!r) {
      return { name: '—', date: '—', podium: [] };
    }
    const podium: PodiumEntry[] = (r.results ?? []).slice(0, 3).map(p => {
      const stand = this.driverStands().find(
        d => d.driverId === p.driverId || d.driver === p.driver,
      );
      return {
        pos: p.position,
        driver: lastNameInitial(p.driver),
        time: p.time ?? '—',
        team: p.team,
        teamColor: teamColor(p.team, stand?.teamColor),
      };
    });
    return {
      name: r.raceName,
      slug: slugifyRace({ raceName: r.raceName }),
      date: new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
              .format(new Date(r.date)),
      podium,
      imageUrl: r.imageUrl ?? undefined,
    };
  }

  private buildNews(): NewsItem[] {
    return this.newsRaw();
  }
}
