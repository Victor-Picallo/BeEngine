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
import { catchError, forkJoin, interval, of } from 'rxjs';
import { mergeDataSources, type DataSource } from '../../core/data-source';
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
import { Moto3LiveService, type Moto3NextRacePayload } from './moto3-live.service';
import type {
  JolpikaCalendarRace,
  JolpikaDriverStanding,
  JolpikaLastRace,
} from '../f1-live/f1-live.types';
import type { Moto3TeamStanding } from './moto3.types';
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
  selector: 'app-moto3-home',
  templateUrl: './moto3-home.page.html',
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
export class Moto3HomePageComponent implements OnInit, OnDestroy {
  private readonly moto3 = inject(Moto3LiveService);
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
  teamStands = signal<Moto3TeamStanding[]>([]);
  lastRaceRaw = signal<JolpikaLastRace | null>(null);
  nextRaceRaw = signal<Moto3NextRacePayload | null>(null);
  newsRaw = signal<NewsItem[]>([]);
  countdown = signal<CountdownTime>({ d: 0, h: 0, m: 0, s: 0 });

  topbarActiveCat = computed(() => 'motogp');
  sidebarActiveCat = computed((): 'motogp' | 'moto2' | 'moto3' => 'moto3');
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
    this.refreshing.set(false);

    forkJoin({
      calendar: this.moto3.getCalendar().pipe(catchError(() => of([] as JolpikaCalendarRace[]))),
      drivers: this.moto3
        .getDriverStandingsResponse()
        .pipe(catchError(() => of({ items: [] as JolpikaDriverStanding[], source: undefined }))),
      teamStands: this.moto3.getOfficialTeamsGrid().pipe(catchError(() => of([] as Moto3TeamStanding[]))),
      lastRace: this.moto3.getLastRace().pipe(catchError(() => of(null as JolpikaLastRace | null))),
      nextRace: this.moto3.getNextRace().pipe(catchError(() => of(null))),
      news: this.newsService.getFeed('moto3', 'Todos', 6, 0).pipe(
        catchError(() =>
          of({ items: [], total: 0, category: 'moto3', tag: 'Todos', page: 1, pageSize: 6, totalPages: 1 }),
        ),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.calendarRaces.set(r.calendar);
          this.driverStands.set(r.drivers.items ?? []);
          this.dataSource.set(mergeDataSources(r.drivers.source));
          this.teamStands.set(r.teamStands);
          this.lastRaceRaw.set(r.lastRace);
          this.nextRaceRaw.set(r.nextRace);
          this.newsRaw.set(
            r.news.items.map((a) => ({
              id: a.id,
              tag: a.tag,
              title: a.title,
              time: a.time,
              hot: a.hot,
              imageUrl: a.imageUrl,
              cat: a.cat ?? 'moto3',
            })),
          );
          this.loading.set(false);
          this.refreshing.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los datos de Moto3. Revisa que el backend esté arrancado.');
          this.loading.set(false);
          this.refreshing.set(false);
        },
      });
  }

  private refreshAll(): void {
    this.refreshing.set(true);
    forkJoin({
      calendar: this.moto3.getCalendar().pipe(catchError(() => of([] as JolpikaCalendarRace[]))),
      driverStands: this.moto3.getDriverStandings(true).pipe(catchError(() => of([] as JolpikaDriverStanding[]))),
      teamStands: this.moto3.getOfficialTeamsGrid(true).pipe(catchError(() => of([] as Moto3TeamStanding[]))),
      lastRace: this.moto3.getLastRace().pipe(catchError(() => of(null as JolpikaLastRace | null))),
      nextRace: this.moto3.getNextRace().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.calendarRaces.set(r.calendar);
          this.driverStands.set(r.driverStands);
          this.teamStands.set(r.teamStands);
          this.lastRaceRaw.set(r.lastRace);
          this.nextRaceRaw.set(r.nextRace);
          this.refreshing.set(false);
        },
        error: () => this.refreshing.set(false),
      });
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
