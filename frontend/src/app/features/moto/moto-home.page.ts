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
import {
  CategoryData,
  Constructor,
  CountdownTime,
  Driver,
  Favorite,
  HEADER_CATEGORIES,
  LastRace,
  NewsItem,
  NextRace,
  PodiumEntry,
  Session,
} from '../../data/sports.data';
import { NewsService } from '../news/news.service';
import { MotoLiveService } from '../moto-live/moto-live.service';
import type {
  JolpikaCalendarRace,
  JolpikaConstructorStanding,
  JolpikaDriverStanding,
  JolpikaLastRace,
} from '../f1-live/f1-live.types';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { RaceCardComponent } from '../../shared/components/race-card/race-card.component';
import { StandingsTableComponent } from '../../shared/components/standings-table/standings-table.component';
import { NewsListComponent } from '../../shared/components/news-list/news-list.component';
import { RightRailComponent } from '../../shared/components/right-rail/right-rail.component';
import { NewsImageComponent } from '../news/news-image/news-image.component';
import { MOTO_HOME_PATH, MOTO_SIDEBAR_CATEGORIES, isMotoCategory } from '../../core/moto/moto-categories';
import { MotoContextService } from '../../core/moto/moto-context.service';
import { MOTO_SECTION_LABELS } from '../../core/moto/moto-sidebar';
import { accentForeground, accentPodiumHighlight } from '../../core/series/series-accent.utils';
import { homePathForSeries } from '../../core/series/series.config';
import type { MotoNextRacePayload } from '../moto-live/moto-live.service';
import { slugifyRace } from '../race/race-slug';

const MOTO_COLORS: Record<string, string> = {
  ducati: '#CC0000',
  aprilia: '#006B3C',
  ktm: '#FF6600',
  yamaha: '#003087',
  honda: '#E60012',
  bmw: '#0066B1',
  'gresini': '#00AEEF',
  'vr46': '#FFD100',
};

const normalize = (s: string) => (s || '').toLowerCase().trim();
const teamColor = (team: string) => {
  const key = normalize(team);
  for (const [k, v] of Object.entries(MOTO_COLORS)) {
    if (key.includes(k)) return v;
  }
  return '#888888';
};

const lastNameInitial = (full: string): string => {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return full;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
};

const REFRESH_IDLE_MS = 5 * 60_000;

@Component({
  selector: 'app-moto-home',
  templateUrl: './moto-home.page.html',
  styleUrl: '../home/home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TopbarComponent,
    SidebarComponent,
    RaceCardComponent,
    StandingsTableComponent,
    NewsListComponent,
    RightRailComponent,
    NewsImageComponent,
  ],
})
export class MotoHomePageComponent implements OnInit, OnDestroy {
  private readonly motoLive = inject(MotoLiveService);
  private readonly newsService = inject(NewsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  readonly motoCtx = inject(MotoContextService);

  readonly categories = HEADER_CATEGORIES;
  readonly sidebarSections = [...MOTO_SECTION_LABELS];
  readonly sidebarCategories = MOTO_SIDEBAR_CATEGORIES;
  readonly homeLink = MOTO_HOME_PATH;

  loading = signal(true);
  refreshing = signal(false);
  error = signal<string | null>(null);

  calendarRaces = signal<JolpikaCalendarRace[]>([]);
  driverStands = signal<JolpikaDriverStanding[]>([]);
  teamStands = signal<JolpikaConstructorStanding[]>([]);
  lastRaceRaw = signal<JolpikaLastRace | null>(null);
  nextRaceRaw = signal<MotoNextRacePayload | null>(null);
  newsRaw = signal<NewsItem[]>([]);
  countdown = signal<CountdownTime>({ d: 0, h: 0, m: 0, s: 0 });

  topbarActiveCat = computed(() => 'motogp');
  sidebarActiveCat = computed(() => this.motoCtx.id());
  currentCat = computed(() => this.motoCtx.config());
  accent = computed(() => this.motoCtx.config().accent);
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

  currentFavorites = computed((): Favorite[] =>
    this.data().standings.slice(0, 2).map((d) => ({
      name: d.driver,
      sub: d.team,
      driverId: d.driverId,
    })),
  );

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
      if (id === 'motogp') {
        void this.router.navigateByUrl(MOTO_HOME_PATH);
        return;
      }
      void this.router.navigate(['/motogp/noticias'], { queryParams: { cat: id, page: null } });
    }
  }

  setTopCat(id: string): void {
    this.setCat(id);
  }

  newsLink(articleId?: string): (string | number)[] {
    return articleId ? ['/motogp/noticias', articleId] : ['/motogp/noticias'];
  }

  private loadAll(): void {
    this.error.set(null);
    this.loading.set(true);
    this.refreshing.set(false);

    forkJoin({
      calendar: this.motoLive.getCalendar().pipe(catchError(() => of([] as JolpikaCalendarRace[]))),
      driverStands: this.motoLive.getDriverStandings().pipe(catchError(() => of([] as JolpikaDriverStanding[]))),
      teamStands: this.motoLive.getConstructorStandings().pipe(catchError(() => of([] as JolpikaConstructorStanding[]))),
      lastRace: this.motoLive.getLastRace().pipe(catchError(() => of(null as JolpikaLastRace | null))),
      nextRace: this.motoLive.getNextRace().pipe(catchError(() => of(null))),
      news: this.newsService.getFeed('motogp', 'Todos', 6, 0).pipe(
        catchError(() =>
          of({ items: [], total: 0, category: 'motogp', tag: 'Todos', page: 1, pageSize: 6, totalPages: 1 }),
        ),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.calendarRaces.set(r.calendar);
          this.driverStands.set(r.driverStands);
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
              cat: a.cat ?? 'motogp',
            })),
          );
          this.loading.set(false);
          this.refreshing.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los datos de MotoGP. Revisa que el backend esté arrancado.');
          this.loading.set(false);
          this.refreshing.set(false);
        },
      });
  }

  private refreshAll(): void {
    this.refreshing.set(true);
    forkJoin({
      calendar: this.motoLive.getCalendar().pipe(catchError(() => of([] as JolpikaCalendarRace[]))),
      driverStands: this.motoLive.getDriverStandings(true).pipe(catchError(() => of([] as JolpikaDriverStanding[]))),
      teamStands: this.motoLive.getConstructorStandings(true).pipe(catchError(() => of([] as JolpikaConstructorStanding[]))),
      lastRace: this.motoLive.getLastRace().pipe(catchError(() => of(null as JolpikaLastRace | null))),
      nextRace: this.motoLive.getNextRace().pipe(catchError(() => of(null))),
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

    return {
      name: ev.raceName,
      circuit: ev.circuitName,
      location: `${ev.locality}, ${ev.country}`,
      date: new Date(dateIso).toISOString(),
      round: ev.round,
      totalRounds,
      sessions,
    };
  }

  private buildStandings(): Driver[] {
    return this.driverStands().map((d) => ({
      pos: d.pos,
      driver: lastNameInitial(d.driver),
      team: d.team,
      points: d.points,
      nationality: d.nationality?.slice(0, 2).toUpperCase() ?? '',
      teamColor: teamColor(d.team),
      driverId: d.driverId?.trim() || undefined,
    }));
  }

  private buildConstructors(): Constructor[] {
    return this.teamStands().map((t) => ({
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
    const podium: PodiumEntry[] = (r.results ?? []).slice(0, 3).map((p) => ({
      pos: p.position,
      driver: lastNameInitial(p.driver),
      time: p.time ?? '—',
      team: p.team,
      teamColor: teamColor(p.team),
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
