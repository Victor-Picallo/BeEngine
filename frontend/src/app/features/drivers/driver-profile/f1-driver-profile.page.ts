import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  EMPTY,
  finalize,
  fromEvent,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import {
  careerEnrichingAfterDbEmission,
  isLiveProfileSource,
  mergeDbWithLiveDriverProfile,
} from '../../../core/profile/hybrid-profile.helpers';
import {
  BackNavigationService,
  RETURN_URL_STATE_KEY,
} from '../../../core/services/back-navigation.service';
import { F1LiveService } from '../../f1-live/f1-live.service';
import type {
  JolpikaDriverProfile,
  JolpikaDriverProfileRaceRow,
  JolpikaDriverStanding,
  OpenF1Driver,
} from '../../f1-live/f1-live.types';
import { AppHeaderComponent } from '../../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../../shared/components/app-sidebar/app-sidebar.component';
import {
  isFeederSeries,
  isMotoFeederSeries,
  isMotoPulseSeries,
} from '../../../core/series/series.config';
import type { SeriesId } from '../../../core/series/series.types';
import { SeriesContextService } from '../../../core/series/series-context.service';
import { SeriesAccentDirective } from '../../../core/series/series-accent.directive';
import {
  countryCodesForDriver,
  flagCdnUrl as driverFlagCdnUrl,
  normalize,
  resolveDriverHeadshotRawUrl,
  resolveDriverHeadshotUrl,
  teamColor,
} from '../drivers-shared';

const NAT_ES: Record<string, string> = {
  British: 'Británico',
  Dutch: 'Neerlandés',
  Spanish: 'Español',
  Monegasque: 'Monegasco',
  Australian: 'Australiano',
  French: 'Francés',
  Italian: 'Italiano',
  Mexican: 'Mexicano',
  Japanese: 'Japonés',
  Thai: 'Tailandés',
  Canadian: 'Canadiense',
  German: 'Alemán',
  Finnish: 'Finlandés',
  Danish: 'Danés',
  Chinese: 'Chino',
  American: 'Estadounidense',
  'New Zealander': 'Neozelandés',
  Argentine: 'Argentino',
  Brazilian: 'Brasileño',
};

function matchOpenF1Driver(profile: JolpikaDriverProfile, open: OpenF1Driver[]): OpenF1Driver | undefined {
  if (!open.length) return undefined;
  const jn = normalize(`${profile.givenName} ${profile.familyName}`);
  const jLast = jn.split(/\s+/).pop() ?? '';
  const exact = open.find(o => normalize(o.fullName) === jn);
  if (exact) return exact;
  return open.find(o => {
    const fn = normalize(o.fullName);
    const parts = fn.split(/\s+/);
    const oLast = parts[parts.length - 1] ?? '';
    return oLast === jLast;
  });
}

function bioCategoryLabel(sid: SeriesId): string {
  if (sid === 'f2') return 'Fórmula 2';
  if (sid === 'f3') return 'Fórmula 3';
  if (sid === 'moto2') return 'Moto2';
  if (sid === 'moto3') return 'Moto3';
  if (sid === 'motogp') return 'MotoGP';
  return 'Fórmula 1';
}

function formatBirthEs(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const months = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];
  return `${d} ${months[m - 1] ?? ''} ${y}`;
}

@Component({
  selector: 'app-f1-driver-profile-page',
  standalone: true,
  imports: [
    AppHeaderComponent,
    AppSidebarComponent,
    RouterLink,
    DecimalPipe,
    UpperCasePipe,
    SeriesAccentDirective,
  ],
  templateUrl: './f1-driver-profile.page.html',
  styleUrls: ['../../calendar/f1-calendar.page.css', './f1-driver-profile.page.css', '../driver-portrait.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class F1DriverProfilePageComponent {
  private readonly f1 = inject(F1LiveService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly backNav = inject(BackNavigationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly seriesCtx = inject(SeriesContextService);
  readonly accent = computed(() => this.seriesCtx.config().accent);
  readonly flagImgUrl = driverFlagCdnUrl;
  readonly fmtBirth = formatBirthEs;

  returnUrl = signal<string | null>(null);
  backLabel = computed(() =>
    this.backNav.labelFor(this.returnUrl(), this.seriesCtx.urlPath('pilotos')),
  );

  loading = signal(true);
  careerHistoryLoading = signal(false);
  /** DB pintada; esperando historial Jolpica en segundo plano. */
  careerEnriching = signal(false);
  error = signal<string | null>(null);
  profile = signal<JolpikaDriverProfile | null>(null);

  private lastLoadedDriverId = '';
  private scrollRestoreY: number | null = null;
  private careerLoadGen = 0;
  openf1 = signal<OpenF1Driver | undefined>(undefined);
  standing = signal<JolpikaDriverStanding | undefined>(undefined);

  teamHue = computed(() => {
    const o = this.openf1();
    const st = this.standing();
    const raw = o?.teamColour?.trim();
    if (raw) {
      const hex = raw.startsWith('#') ? raw : `#${raw}`;
      if (/^#[0-9A-Fa-f]{6}$/i.test(hex)) return hex;
    }
    return teamColor(o?.teamName ?? st?.team ?? '');
  });

  headshotUrl = computed(() => {
    const p = this.profile();
    const full = p ? `${p.givenName} ${p.familyName}`.trim() : '';
    const sid = this.seriesCtx.id();
    const mediaUrl =
      isMotoPulseSeries(sid) || sid === 'f2' || sid === 'f3'
        ? p?.headshotUrl
        : this.openf1()?.headshotUrl;
    return resolveDriverHeadshotUrl(p?.driverId ?? '', full, mediaUrl ?? p?.headshotUrl, {
      // F2/F3: «card» = imagen completa; «large» solo en clasificación.
      ...(sid === 'f2' || sid === 'f3' ? { size: 'card' as const } : {}),
      seriesId: sid,
    });
  });

  displayNumber = computed(() => {
    const n = this.openf1()?.driverNumber;
    if (Number.isFinite(n)) return String(n);
    const p = this.profile()?.number;
    return p != null ? String(p) : '—';
  });

  nationalityLabel = computed(() => {
    const n = this.profile()?.nationality ?? '';
    return NAT_ES[n] ?? n;
  });

  countryCode2 = computed(() => {
    const p = this.profile();
    const o = this.openf1();
    if (!p) return '';
    const fake: JolpikaDriverStanding = {
      pos: 0,
      driver: `${p.givenName} ${p.familyName}`,
      driverId: p.driverId,
      team: o?.teamName ?? this.standing()?.team ?? '',
      points: 0,
      wins: 0,
      nationality: p.nationality,
    };
    return countryCodesForDriver(fake, o).alpha2;
  });

  bioText = computed(() => {
    const p = this.profile();
    if (!p) return '';
    const sid = this.seriesCtx.id();
    const name = `${p.givenName} ${p.familyName}`;
    const nat = NAT_ES[p.nationality] ?? p.nationality;
    const born = formatBirthEs(p.dateOfBirth);
    const num = this.displayNumber();
    const s = p.stats;
    const category = bioCategoryLabel(sid);
    const raceWord = isMotoPulseSeries(sid) ? 'carreras' : 'grandes premios';
    const numBit = num !== '—' ? ` con el dorsal ${num}` : '';
    return (
      `${name} (${nat}, nacido el ${born}) compite en ${category}${numBit}. ` +
      `Debutó en ${p.debut}. ` +
      `Ha disputado ${s.races} ${raceWord}, con ${s.wins} victorias, ${s.podiums} podios` +
      `${isMotoPulseSeries(sid) ? '' : ` y ${s.poles} poles`}. ` +
      `En lo que va de la temporada ${p.currentSeasonYear} lleva ${s.winsCurrentSeason} victorias. ` +
      `Suma ${Math.floor(s.points)} puntos en su trayectoria en la categoría.`
    );
  });

  maxCareerPts = computed(() => {
    const p = this.profile();
    const meta = p?.careerHistoryPagination;
    if (meta != null && meta.maxPts > 0) return meta.maxPts;
    const rows = p?.careerHistory ?? [];
    if (!rows.length) return 1;
    return Math.max(...rows.map(r => r.pts), 1);
  });

  careerSeasonCount(p: JolpikaDriverProfile): number {
    return p.careerHistoryPagination?.totalYears ?? p.careerHistory.length;
  }

  stepCareerPage(delta: number): void {
    const pag = this.profile()?.careerHistoryPagination;
    if (!pag || this.careerHistoryLoading()) return;
    const next = Math.min(Math.max(1, pag.page + delta), pag.totalPages);
    if (next === pag.page) return;
    this.loadCareerPage(next, true);
  }

  constructor() {
    this.returnUrl.set(this.backNav.captureReturnUrl());

    fromEvent(window, 'popstate')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const id = this.route.snapshot.paramMap.get('driverId')?.trim() ?? '';
        if (!id || id !== this.lastLoadedDriverId || !this.profile()) return;
        const page = this.readCareerPageFromUrl();
        const cur = this.profile()?.careerHistoryPagination?.page ?? 1;
        if (page === cur) return;
        this.loadCareerPage(page, false);
      });

    this.route.paramMap
      .pipe(
        map((params) => params.get('driverId')?.trim() ?? ''),
        switchMap((id) => {
          if (!id) {
            this.loading.set(false);
            this.error.set('Piloto no indicado.');
            return EMPTY;
          }
          this.lastLoadedDriverId = '';
          return this.loadFullProfile(id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private readCareerPageFromUrl(): number {
    return Math.max(
      1,
      parseInt(this.route.snapshot.queryParamMap.get('careerPage') || '1', 10) || 1,
    );
  }

  goBack(): void {
    this.backNav.goBack(this.seriesCtx.path('pilotos'), this.returnUrl());
  }

  private syncCareerPageUrl(page: number): void {
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { careerPage: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
    const url = this.router.serializeUrl(tree);
    const prev = (history.state ?? {}) as Record<string, unknown>;
    const returnUrl = this.returnUrl() ?? prev[RETURN_URL_STATE_KEY];
    this.location.replaceState(
      url,
      '',
      returnUrl ? { ...prev, [RETURN_URL_STATE_KEY]: returnUrl } : prev,
    );
  }

  private restoreScroll(): void {
    if (this.scrollRestoreY == null) return;
    const y = this.scrollRestoreY;
    this.scrollRestoreY = null;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }

  private loadCareerPage(page: number, updateUrl: boolean): void {
    const id = this.lastLoadedDriverId;
    if (!id || !this.profile()) return;

    if (updateUrl) {
      this.scrollRestoreY = window.scrollY;
      this.syncCareerPageUrl(page);
    }

    const gen = ++this.careerLoadGen;
    this.careerHistoryLoading.set(true);
    this.f1
      .getDriverProfile(id, page, { liveRefresh: true })
      .pipe(
        catchError(() => EMPTY),
        finalize(() => {
          if (gen !== this.careerLoadGen) return;
          this.careerHistoryLoading.set(false);
          this.restoreScroll();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((profile) => {
        if (!profile || gen !== this.careerLoadGen) return;
        const prev = this.profile()!;
        const merged =
          prev.source === 'db' && isLiveProfileSource(profile.source)
            ? mergeDbWithLiveDriverProfile(prev, profile)
            : { ...prev, ...profile };
        this.profile.set({
          ...merged,
          careerHistory: profile.careerHistory,
          careerHistoryPagination: profile.careerHistoryPagination,
        });
        this.careerEnriching.set(false);
      });
  }

  private applyProfileEmission(incoming: JolpikaDriverProfile): void {
    const prev = this.profile();
    const next =
      prev && prev.source === 'db' && isLiveProfileSource(incoming.source)
        ? mergeDbWithLiveDriverProfile(prev, incoming)
        : incoming;

    this.profile.set(next);
    this.loading.set(false);
    this.error.set(null);

    if (incoming.source === 'db') {
      this.careerEnriching.set(careerEnrichingAfterDbEmission(incoming));
    } else if (isLiveProfileSource(incoming.source)) {
      this.careerEnriching.set(false);
    }
  }

  private loadFullProfile(id: string): Observable<void> {
    this.syncCareerPageUrl(1);
    const careerPage = 1;
    this.loading.set(true);
    this.careerEnriching.set(false);
    this.error.set(null);
    this.openf1.set(undefined);
    this.standing.set(undefined);

    let sideEffectsStarted = false;

    return this.f1.getDriverProfile(id, careerPage).pipe(
      tap((profile) => {
        if (!profile) return;
        this.lastLoadedDriverId = id;
        this.applyProfileEmission(profile);
        if (!sideEffectsStarted) {
          sideEffectsStarted = true;
          this.runProfileSideEffects(id, profile);
        }
      }),
      catchError(() => {
        this.profile.set(null);
        this.loading.set(false);
        this.careerEnriching.set(false);
        this.error.set('No se encontró la ficha de este piloto.');
        return EMPTY;
      }),
      finalize(() => this.careerEnriching.set(false)),
      map(() => undefined),
    );
  }

  private runProfileSideEffects(id: string, profile: JolpikaDriverProfile): void {
    this.f1
      .getDrivers('latest')
      .pipe(
        tap((openf1) => {
          const p = this.profile();
          if (!p) return;
          this.openf1.set(matchOpenF1Driver(p, openf1));
        }),
        catchError(() => {
          this.openf1.set(undefined);
          return of(undefined);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.f1
      .getDriverStandings()
      .pipe(
        tap((standings) => {
          const p = this.profile();
          if (!p) return;
          this.standing.set(standings.find((s) => s.driverId === p.driverId));
        }),
        catchError(() => {
          this.standing.set(undefined);
          return of(undefined);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    if (!profile.aggregatesPending && profile.statsSource === 'api') {
      return;
    }

    const mergeAggregates = (agg: {
      championships: number;
      stats: JolpikaDriverProfile['stats'];
      debut: string;
      maxCareerPts: number;
      partial?: boolean;
    }) => {
      const cur = this.profile();
      if (!cur) return;
      const pag = cur.careerHistoryPagination;
      const stillPending = agg.partial === true;
      const statsSource = stillPending
        ? cur.statsSource === 'api'
          ? 'api'
          : 'live'
        : 'api';
      const nextStats = stillPending
        ? {
            wins: Math.max(cur.stats.wins, agg.stats.wins ?? 0),
            podiums: Math.max(cur.stats.podiums, agg.stats.podiums ?? 0),
            poles: Math.max(cur.stats.poles, agg.stats.poles ?? 0),
            fastestLaps: Math.max(cur.stats.fastestLaps, agg.stats.fastestLaps ?? 0),
            races: Math.max(cur.stats.races, agg.stats.races ?? 0),
            points: Math.max(cur.stats.points, agg.stats.points ?? 0),
            winsCurrentSeason: agg.stats.winsCurrentSeason ?? cur.stats.winsCurrentSeason,
          }
        : agg.stats;
      this.profile.set({
        ...cur,
        championships: stillPending
          ? Math.max(cur.championships, agg.championships ?? 0)
          : agg.championships,
        debut: agg.debut?.trim() ? agg.debut : cur.debut,
        stats: nextStats,
        aggregatesPending: stillPending,
        aggregatesError: false,
        statsSource,
        careerHistoryPagination: pag
          ? { ...pag, maxPts: agg.maxCareerPts ?? pag.maxPts }
          : null,
      });
    };

    this.f1
      .getDriverProfileAggregates(id)
      .pipe(
        tap((agg) => mergeAggregates(agg)),
        catchError(() => {
          const cur = this.profile();
          if (cur && !cur.championships && !cur.stats.wins) {
            this.profile.set({
              ...cur,
              aggregatesPending: false,
              aggregatesError: true,
            });
          }
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  imgError(ev: Event): void {
    const el = ev.target;
    if (!(el instanceof HTMLImageElement)) return;
    const sid = this.seriesCtx.id();
    if (!el.dataset['portraitRetry'] && el.classList.contains('dp-headshot')) {
      const id = this.profile()?.driverId ?? '';
      if (isFeederSeries(sid) && !isMotoFeederSeries(sid)) {
        const raw = resolveDriverHeadshotRawUrl(id, sid);
        if (raw) {
          el.dataset['portraitRetry'] = '1';
          el.src = raw;
          return;
        }
      }
      if (sid === 'moto2' || sid === 'moto3') {
        const local = resolveDriverHeadshotUrl(id, '', null, { seriesId: sid });
        if (local && local !== el.src) {
          el.dataset['portraitRetry'] = '1';
          el.src = local;
          return;
        }
      }
    }
    el.style.display = 'none';
  }

  photoLoaded(ev: Event): void {
    const el = ev.target;
    if (!(el instanceof HTMLImageElement)) return;
    el.closest('.dp-photo-wrap')?.classList.add('dp-photo-loaded');
  }

  rowTeamColor(teamName: string): string {
    return teamColor(teamName);
  }

  seasonSummary(races: JolpikaDriverProfileRaceRow[]): { wins: number; podiums: number; pts: number } {
    const wins = races.filter(r => r.pos === 1).length;
    const podiums = races.filter(r => r.pos > 0 && r.pos <= 3).length;
    const pts = races.reduce((a, r) => a + r.pts, 0);
    return { wins, podiums, pts };
  }
}
