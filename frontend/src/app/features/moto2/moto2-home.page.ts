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
import { Router, RouterLink } from '@angular/router';
import { catchError, interval, of } from 'rxjs';
import {
  mergeHybridSources,
  startHybridLoad,
} from '../../core/profile/hybrid-dashboard.helpers';
import type { DataSource } from '../../core/data-source';
import { DataSourceBadgeComponent } from '../../shared/components/data-source-badge/data-source-badge.component';
import {
  CategoryData,
  Constructor,
  CountdownTime,
  Driver,
  HEADER_CATEGORIES,
  LastRace,
  NewsItem,
  NextRace,
  PodiumEntry,
  Session,
} from '../../data/sports.data';
import { NewsService } from '../news/news.service';
import { Moto2LiveService, type Moto2NextRacePayload } from './moto2-live.service';
import type {
  JolpikaCalendarRace,
  JolpikaDriverStanding,
  JolpikaLastRace,
} from '../f1-live/f1-live.types';
import type { Moto2TeamStanding } from './moto2.types';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { RaceCardComponent } from '../../shared/components/race-card/race-card.component';
import { StandingsTableComponent } from '../../shared/components/standings-table/standings-table.component';
import { NewsListComponent } from '../../shared/components/news-list/news-list.component';
import { RightRailComponent } from '../../shared/components/right-rail/right-rail.component';
import { NewsImageComponent } from '../news/news-image/news-image.component';
import { isMotoCategory } from '../../core/series/series-moto';
import { SeriesContextService } from '../../core/series/series-context.service';
import { accentForeground, accentPodiumHighlight } from '../../core/series/series-accent.utils';
import { homePathForSeries } from '../../core/series/series.config';
import { slugifyRace } from '../race/race-slug';
import { teamColor } from '../drivers/drivers-shared';

const lastNameInitial = (full: string): string => {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return full;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
};

const REFRESH_IDLE_MS = 5 * 60_000;

@Component({
  selector: 'app-moto2-home',
  templateUrl: './moto2-home.page.html',
  styleUrl: '../home/home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TopbarComponent,
    AppSidebarComponent,
    RaceCardComponent,
    StandingsTableComponent,
    NewsListComponent,
    RightRailComponent,
    NewsImageComponent,
    DataSourceBadgeComponent,
  ],
})
export class Moto2HomePageComponent implements OnInit, OnDestroy {
  private readonly moto2 = inject(Moto2LiveService);
  private readonly newsService = inject(NewsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  readonly seriesCtx = inject(SeriesContextService);
  readonly categories = HEADER_CATEGORIES;
  readonly homeLink = computed(() => this.seriesCtx.homePath());

  loading = signal(true);
  refreshing = signal(false);
  error = signal<string | null>(null);
  dataSource = signal<DataSource | null>(null);

  calendarRaces = signal<JolpikaCalendarRace[]>([]);
  driverStands = signal<JolpikaDriverStanding[]>([]);
  teamStands = signal<Moto2TeamStanding[]>([]);
  lastRaceRaw = signal<JolpikaLastRace | null>(null);
  nextRaceRaw = signal<Moto2NextRacePayload | null>(null);
  newsRaw = signal<NewsItem[]>([]);
  countdown = signal<CountdownTime>({ d: 0, h: 0, m: 0, s: 0 });

  topbarActiveCat = computed(() => 'motogp');
  sidebarActiveCat = computed((): 'motogp' | 'moto2' | 'moto3' => 'moto2');
  currentCat = computed(() => this.seriesCtx.config());
  accent = computed(() => this.seriesCtx.config().accent);
  accentFg = computed(() => accentForeground(this.accent()));
  accentPodium = computed(() => accentPodiumHighlight(this.accent()));

  data = computed<CategoryData>(() => ({
    nextRace: this.buildNextRace(),
    standings: this.buildStandings(),
    constructors: this.buildConstructors(),
    lastRace: this.buildLastRace(),
    news: this.newsRaw(),
  }));

  hasData = computed(
    () =>
      this.calendarRaces().length > 0 ||
      this.driverStands().length > 0 ||
      this.lastRaceRaw() !== null,
  );

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
  lastRaceWinner = computed(() => this.data().lastRace.podium[0]?.driver ?? '—');
  maxConstructorPoints = computed(() => {
    const c = this.data().constructors;
    return c.length ? Math.max(...c.map((x) => x.points)) : 1;
  });

  private countdownInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.loadAll();
    this.startIntervals();
  }

  ngOnDestroy(): void {
    clearInterval(this.countdownInterval);
  }

  setCat(id: string): void {
    if (id === 'f1') {
      void this.router.navigateByUrl(homePathForSeries('f1'));
      return;
    }
    if (isMotoCategory(id)) {
      void this.router.navigateByUrl(`/${id}`);
    }
  }

  setTopCat(id: string): void {
    this.setCat(id);
  }

  newsLink(articleId?: string): (string | number)[] {
    return this.seriesCtx.path('noticias', ...(articleId ? [articleId] : []));
  }

  seriesLink(...segments: string[]): string[] {
    return this.seriesCtx.path(...segments) as string[];
  }

  private loadAll(): void {
    this.error.set(null);
    this.loading.set(true);
    this.refreshing.set(true);

    startHybridLoad(
      [
        {
          load: () => this.moto2.getCalendar().pipe(catchError(() => of([] as JolpikaCalendarRace[]))),
          onValue: (calendar) => this.calendarRaces.set(calendar as JolpikaCalendarRace[]),
        },
        {
          load: () =>
            this.moto2.getDriverStandingsResponse().pipe(
              catchError(() => of({ items: [] as JolpikaDriverStanding[], source: undefined })),
            ),
          onValue: (res) => {
            const r = res as { items?: JolpikaDriverStanding[] };
            this.driverStands.set(r.items ?? []);
          },
        },
        {
          load: () =>
            this.moto2.getOfficialTeamsGrid().pipe(catchError(() => of([] as Moto2TeamStanding[]))),
          onValue: (teams) => this.teamStands.set(teams as Moto2TeamStanding[]),
        },
        {
          load: () =>
            this.moto2.getLastRace().pipe(catchError(() => of(null as JolpikaLastRace | null))),
          onValue: (lr) => this.lastRaceRaw.set(lr as JolpikaLastRace | null),
        },
        {
          load: () => this.moto2.getNextRace().pipe(catchError(() => of(null))),
          onValue: (nr) => this.nextRaceRaw.set(nr as Moto2NextRacePayload | null),
        },
        {
          load: () =>
            this.newsService.getFeed('moto2', 'Todos', 6, 0).pipe(
              catchError(() =>
                of({
                  items: [],
                  total: 0,
                  category: 'moto2',
                  tag: 'Todos',
                  page: 1,
                  pageSize: 6,
                  totalPages: 1,
                }),
              ),
            ),
          onValue: (feed) => {
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
            this.newsRaw.set(
              f.items.map((a) => ({
                id: a.id,
                tag: a.tag,
                title: a.title,
                time: a.time,
                hot: a.hot,
                imageUrl: a.imageUrl,
                cat: a.cat ?? 'moto2',
              })),
            );
          },
        },
      ],
      {
        isActive: () => true,
        onReady: () => {
          this.loading.set(false);
          this.error.set(null);
        },
        onSources: (sources) => this.dataSource.set(mergeHybridSources(sources)),
        onAllSettled: () => this.refreshing.set(false),
      },
    );
  }

  private refreshAll(): void {
    this.refreshing.set(true);
    let pending = 5;
    const tick = () => {
      pending -= 1;
      if (pending === 0) this.refreshing.set(false);
    };

    this.moto2
      .getCalendar()
      .pipe(catchError(() => of([] as JolpikaCalendarRace[])), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (c) => this.calendarRaces.set(c), complete: tick, error: tick });

    this.moto2
      .getDriverStandingsResponse(true)
      .pipe(
        catchError(() => of({ items: [] as JolpikaDriverStanding[], source: undefined })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r) => {
          this.driverStands.set(r.items ?? []);
          this.dataSource.set(mergeHybridSources([r.source]));
        },
        complete: tick,
        error: tick,
      });

    this.moto2
      .getOfficialTeamsGrid(true)
      .pipe(catchError(() => of([] as Moto2TeamStanding[])), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (t) => this.teamStands.set(t), complete: tick, error: tick });

    this.moto2
      .getLastRace()
      .pipe(catchError(() => of(null as JolpikaLastRace | null)), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => this.lastRaceRaw.set(r), complete: tick, error: tick });

    this.moto2
      .getNextRace()
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (n) => this.nextRaceRaw.set(n), complete: tick, error: tick });
  }

  private startIntervals(): void {
    const tick = () => {
      const ev = this.nextRaceRaw()?.event;
      if (!ev?.date) {
        this.countdown.set({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      const raceSession = this.nextRaceRaw()?.sessions?.find((s) => s.highlight);
      const targetIso = raceSession?.dateIso ?? ev.date;
      const target = new Date(targetIso).getTime();
      const diff = target - Date.now();
      if (diff <= 0) {
        this.countdown.set({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      this.countdown.set({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    this.countdownInterval = setInterval(tick, 1000);
    interval(REFRESH_IDLE_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshAll());
  }

  private buildNextRace(): NextRace {
    const nr = this.nextRaceRaw();
    const cal = this.calendarRaces();
    const totalRounds = nr?.event?.totalRounds ?? (cal.length || 22);
    const ev = nr?.event;
    if (!ev) {
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = cal.find((r) => r.date >= today) ?? cal.at(-1);
      if (!upcoming) {
        return {
          name: '—',
          circuit: '—',
          location: '—',
          date: new Date().toISOString(),
          round: 0,
          totalRounds,
          sessions: [],
        };
      }
      const dateIso = `${upcoming.date}T${upcoming.time ?? '12:00:00'}Z`;
      return {
        name: upcoming.raceName,
        circuit: upcoming.circuitName,
        location: `${upcoming.locality}, ${upcoming.country}`,
        date: dateIso,
        round: upcoming.round,
        totalRounds,
        sessions: [],
        circuitSvgUrl: upcoming.circuitSvgUrl ?? null,
        circuitImageUrl: upcoming.circuitImageUrl ?? null,
      };
    }

    const sessions: Session[] = (nr.sessions ?? []).map((s) => ({
      name: s.name,
      date: s.date,
      time: s.time,
      highlight: s.highlight,
    }));
    const raceSession = sessions.find((s) => s.highlight);
    const dateIso = raceSession
      ? (nr.sessions?.find((x) => x.highlight)?.dateIso ?? ev.date)
      : ev.date;
    const calMatch = cal.find((r) => r.round === ev.round);
    return {
      name: ev.raceName,
      circuit: ev.circuitName,
      location: `${ev.locality}, ${ev.country}`,
      date: new Date(dateIso).toISOString(),
      round: ev.round,
      totalRounds,
      sessions,
      circuitSvgUrl: ev.circuitSvgUrl ?? calMatch?.circuitSvgUrl ?? null,
      circuitImageUrl: ev.circuitImageUrl ?? calMatch?.circuitImageUrl ?? null,
    };
  }

  private buildStandings(): Driver[] {
    return this.driverStands().map((d) => ({
      pos: d.pos,
      driver: lastNameInitial(d.driver),
      team: d.team,
      points: d.points,
      nationality: d.nationality?.slice(0, 2).toUpperCase() ?? '',
      teamColor: teamColor(d.team, d.teamColor),
      driverId: d.driverId?.trim() || undefined,
    }));
  }

  private buildConstructors(): Constructor[] {
    return this.teamStands().map((t) => ({
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
    const podium: PodiumEntry[] = (r.results ?? []).slice(0, 3).map((p) => ({
      pos: p.position,
      driver: lastNameInitial(p.driver),
      time: p.time ?? '—',
      team: p.team,
      teamColor: teamColor(p.team, p.teamColor),
    }));
    return {
      name: r.raceName,
      slug: slugifyRace({ raceName: r.raceName }),
      date: new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(r.date)),
      podium,
    };
  }
}
