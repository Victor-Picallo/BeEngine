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
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  EMPTY,
  finalize,
  fromEvent,
  ignoreElements,
  map,
  expand,
  merge,
  Observable,
  of,
  switchMap,
  takeWhile,
  tap,
  timer,
} from 'rxjs';
import { BackNavigationService } from '../../../core/services/back-navigation.service';
import { F1LiveService } from '../../f1-live/f1-live.service';
import type {
  JolpikaConstructorProfile,
  JolpikaConstructorProfileCareerRow,
  JolpikaConstructorProfileDriver,
  OpenF1Driver,
} from '../../f1-live/f1-live.types';
import { AppHeaderComponent } from '../../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../../shared/components/app-sidebar/app-sidebar.component';
import {
  ACCENT,
  countryCodesFromNationality,
  flagCdnUrl,
  normalize,
  resolveDriverHeadshotUrl,
  teamColor,
} from '../../drivers/drivers-shared';
import { f1TeamCarImageUrl, f1TeamShowcaseImageUrl } from '../constructors-media';

function matchOpenF1Driver(
  d: JolpikaConstructorProfileDriver,
  open: OpenF1Driver[],
): OpenF1Driver | undefined {
  if (!open.length) return undefined;
  const jn = normalize(`${d.givenName} ${d.familyName}`);
  const jLast = jn.split(/\s+/).pop() ?? '';
  const exact = open.find((o) => normalize(o.fullName) === jn);
  if (exact) return exact;
  return open.find((o) => {
    const fn = normalize(o.fullName);
    const parts = fn.split(/\s+/);
    const oLast = parts[parts.length - 1] ?? '';
    return oLast === jLast;
  });
}

@Component({
  selector: 'app-f1-constructor-profile-page',
  standalone: true,
  imports: [AppHeaderComponent, AppSidebarComponent, RouterLink, DecimalPipe],
  templateUrl: './f1-constructor-profile.page.html',
  styleUrls: [
    '../../calendar/f1-calendar.page.css',
    '../../drivers/driver-profile/f1-driver-profile.page.css',
    './f1-constructor-profile.page.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class F1ConstructorProfilePageComponent {
  private readonly f1 = inject(F1LiveService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly backNav = inject(BackNavigationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly accent = ACCENT;
  readonly flagImgUrl = flagCdnUrl;

  loading = signal(true);
  careerHistoryLoading = signal(false);
  error = signal<string | null>(null);
  profile = signal<JolpikaConstructorProfile | null>(null);
  openf1Drivers = signal<OpenF1Driver[]>([]);

  private lastLoadedConstructorId = '';
  private scrollRestoreY: number | null = null;
  private careerLoadGen = 0;

  teamHue = computed(() => teamColor(this.profile()?.name ?? ''));

  logoUrl = computed(() => f1TeamShowcaseImageUrl(this.profile()?.constructorId ?? ''));

  carUrl = computed(() => f1TeamCarImageUrl(this.profile()?.constructorId ?? ''));

  maxCumPts = computed(() => {
    const rows = this.profile()?.currentSeason ?? [];
    if (!rows.length) return 1;
    return Math.max(...rows.map((r) => r.cumPts), 1);
  });

  maxCareerPts = computed(() => {
    const p = this.profile();
    const meta = p?.careerHistoryPagination;
    if (meta != null && meta.maxPts > 0) return meta.maxPts;
    const rows = p?.careerHistory ?? [];
    if (!rows.length) return 1;
    return Math.max(...rows.map((r) => r.pts), 1);
  });

  cumBarPx(cum: number): number {
    const max = this.maxCumPts() * 1.08 || 1;
    return Math.max(4, Math.round((cum / max) * 40));
  }

  driverHeadshot = (d: JolpikaConstructorProfileDriver): string => {
    const o = matchOpenF1Driver(d, this.openf1Drivers());
    return resolveDriverHeadshotUrl(d.driverId, `${d.givenName} ${d.familyName}`, o?.headshotUrl);
  };

  country2ForDriver(d: JolpikaConstructorProfileDriver): string {
    return countryCodesFromNationality(d.nationality).alpha2;
  }

  constructorChampion(h: JolpikaConstructorProfileCareerRow): boolean {
    if (h.titleWon === true) return true;
    if (h.titleWon === false) return false;
    const cy = this.profile()?.currentSeasonYear;
    if (cy == null || !Number.isFinite(cy)) return false;
    return Number(h.pos) === 1 && h.year < cy;
  }

  careerSeasonCount(p: JolpikaConstructorProfile): number {
    return p.careerHistoryPagination?.totalYears ?? p.careerHistory.length;
  }

  retryCareerHistory(): void {
    const pag = this.profile()?.careerHistoryPagination;
    const page = pag?.page ?? 1;
    this.loadCareerPage(page, false);
  }

  stepCareerPage(delta: number): void {
    const pag = this.profile()?.careerHistoryPagination;
    if (!pag || this.careerHistoryLoading()) return;
    const next = Math.min(Math.max(1, pag.page + delta), pag.totalPages);
    if (next === pag.page) return;
    this.loadCareerPage(next, true);
  }

  constructor() {
    fromEvent(window, 'popstate')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const id = this.route.snapshot.paramMap.get('constructorId')?.trim() ?? '';
        if (!id || id !== this.lastLoadedConstructorId || !this.profile()) return;
        const page = this.readCareerPageFromUrl();
        const cur = this.profile()?.careerHistoryPagination?.page ?? 1;
        if (page === cur) return;
        this.loadCareerPage(page, false);
      });

    this.route.paramMap
      .pipe(
        map((params) => params.get('constructorId')?.trim() ?? ''),
        switchMap((id) => {
          if (!id) {
            this.loading.set(false);
            this.error.set('Escudería no indicada.');
            return EMPTY;
          }
          this.lastLoadedConstructorId = '';
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
    this.backNav.goBack('/f1/escuderias');
  }

  private syncCareerPageUrl(page: number): void {
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { careerPage: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
    this.location.replaceState(this.router.serializeUrl(tree));
  }

  private restoreScroll(): void {
    if (this.scrollRestoreY == null) return;
    const y = this.scrollRestoreY;
    this.scrollRestoreY = null;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }

  private loadCareerPage(page: number, updateUrl: boolean): void {
    const id = this.lastLoadedConstructorId;
    if (!id || !this.profile()) return;

    if (updateUrl) {
      this.scrollRestoreY = window.scrollY;
      this.syncCareerPageUrl(page);
    }

    const gen = ++this.careerLoadGen;
    this.careerHistoryLoading.set(true);
    this.f1
      .getConstructorProfile(id, page)
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
        this.profile.set({
          ...prev,
          careerHistory: profile.careerHistory,
          careerHistoryPagination: profile.careerHistoryPagination,
          careerHistoryError: profile.careerHistoryError,
        });
      });
  }

  private loadFullProfile(id: string): Observable<void> {
    this.syncCareerPageUrl(1);
    const careerPage = 1;
    this.loading.set(true);
    this.error.set(null);
    this.openf1Drivers.set([]);

    return this.f1.getConstructorProfile(id, careerPage).pipe(
      catchError(() => {
        this.profile.set(null);
        this.loading.set(false);
        this.error.set('No se encontró la ficha de esta escudería.');
        return EMPTY;
      }),
      switchMap((profile) => {
        if (!profile) return EMPTY;

        this.lastLoadedConstructorId = id;
        this.profile.set(profile);
        this.loading.set(false);
        this.error.set(null);

        const mergeAggregates = (agg: {
          stats: JolpikaConstructorProfile['stats'];
          bioText: string;
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
                championships: Math.max(cur.stats.championships, agg.stats.championships ?? 0),
                totalWins: Math.max(cur.stats.totalWins, agg.stats.totalWins ?? 0),
                totalPodiums: Math.max(cur.stats.totalPodiums, agg.stats.totalPodiums ?? 0),
                totalPoles: Math.max(cur.stats.totalPoles, agg.stats.totalPoles ?? 0),
              }
            : agg.stats;
          this.profile.set({
            ...cur,
            stats: nextStats,
            bioText: agg.bioText?.trim() ? agg.bioText : cur.bioText,
            aggregatesPending: stillPending,
            aggregatesError: false,
            statsSource,
            careerHistoryPagination: pag ? { ...pag, maxPts: agg.maxCareerPts ?? pag.maxPts } : null,
          });
        };

        const drivers$ = this.f1.getDrivers('latest').pipe(
          tap((d) => this.openf1Drivers.set(d)),
          catchError(() => {
            this.openf1Drivers.set([]);
            return of(undefined);
          }),
        );

        const shouldSyncAggregates =
          profile.source !== 'manual' &&
          (profile.aggregatesPending || profile.statsSource !== 'api');

        if (!shouldSyncAggregates) {
          return drivers$.pipe(map(() => undefined));
        }

        const agg$ = this.f1.getConstructorProfileAggregates(id).pipe(
          expand((agg, i) =>
            agg.partial && i < 40
              ? timer(5000).pipe(switchMap(() => this.f1.getConstructorProfileAggregates(id)))
              : EMPTY,
          ),
          tap((agg) => mergeAggregates(agg)),
          takeWhile((agg) => agg.partial === true, true),
          catchError(() => {
            const cur = this.profile();
            if (cur && !cur.stats.championships && !cur.stats.totalWins) {
              this.profile.set({
                ...cur,
                aggregatesPending: false,
                aggregatesError: true,
              });
            }
            return EMPTY;
          }),
          ignoreElements(),
        );

        return merge(drivers$, agg$).pipe(map(() => undefined));
      }),
    );
  }

  imgError(ev: Event): void {
    const el = ev.target;
    if (el instanceof HTMLImageElement) el.style.display = 'none';
  }
}
