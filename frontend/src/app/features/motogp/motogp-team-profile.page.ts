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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize, map, Observable, switchMap, tap } from 'rxjs';
import {
  careerEnrichingAfterDbEmission,
  isLiveProfileSource,
  mergeDbWithLiveTeamProfile,
} from '../../core/profile/hybrid-profile.helpers';
import { ReturnNavDirective } from '../../core/directives/return-nav.directive';
import { MotogpPulseService } from './motogp-pulse.service';
import { SeriesContextService } from '../../core/series/series-context.service';
import type {
  MotogpTeamProfile,
  MotogpTeamProfileCareerRow,
  MotogpTeamProfileDriver,
} from './motogp.types';
import { motogpTeamBikeUrl, motogpTeamLogoUrl } from './motogp-media';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { SeriesAccentDirective } from '../../core/series/series-accent.directive';
import {
  countryCodesFromNationality,
  flagCdnUrl,
  resolveDriverHeadshotUrl,
  teamColor,
} from '../drivers/drivers-shared';


@Component({
  selector: 'app-motogp-team-profile-page',
  standalone: true,
  imports: [
    AppHeaderComponent,
    AppSidebarComponent,
    RouterLink,
    ReturnNavDirective,
    DecimalPipe,
    SeriesAccentDirective,
  ],
  templateUrl: './motogp-team-profile.page.html',
  styleUrls: [
    '../calendar/f1-calendar.page.css',
    '../drivers/driver-profile/f1-driver-profile.page.css',
    '../constructors/constructor-profile/f1-constructor-profile.page.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotogpTeamProfilePageComponent {
  private readonly motogp = inject(MotogpPulseService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  readonly seriesCtx = inject(SeriesContextService);

  readonly accent = computed(() => this.seriesCtx.config().accent);
  readonly teamsPath = computed(() => this.seriesCtx.urlPath('escuderias'));
  readonly flagImgUrl = flagCdnUrl;

  loading = signal(true);
  careerHistoryLoading = signal(false);
  careerEnriching = signal(false);
  error = signal<string | null>(null);
  profile = signal<MotogpTeamProfile | null>(null);

  private lastLoadedConstructorId = '';
  private scrollRestoreY: number | null = null;
  private careerLoadGen = 0;

  readonly isManufacturerHistory = computed(
    () => this.profile()?.historyScope === 'manufacturer',
  );

  teamHue = computed(() =>
    teamColor(this.profile()?.name ?? '', this.profile()?.teamColor),
  );

  logoUrl = computed(() => {
    const p = this.profile();
    return motogpTeamLogoUrl(p?.constructorId, p?.teamId, p?.logoUrl, p?.name);
  });

  bikeUrl = computed(() => {
    const p = this.profile();
    return motogpTeamBikeUrl(p?.bikeImageUrl, p?.constructorId, p?.teamId);
  });

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
    return Math.max(...rows.map((h) => h.pts), p?.standing?.points ?? 0, 1);
  });

  cumBarPx(cum: number): number {
    const max = this.maxCumPts() * 1.08 || 1;
    return Math.max(4, Math.round((cum / max) * 40));
  }

  careerSeasonCount(p: MotogpTeamProfile): number {
    return p.careerHistoryPagination?.totalYears ?? p.careerHistory.length;
  }

  constructorChampion(h: MotogpTeamProfileCareerRow): boolean {
    if (h.titleWon === true) return true;
    if (h.titleWon === false) return false;
    return false;
  }

  stepCareerPage(delta: number): void {
    const pag = this.profile()?.careerHistoryPagination;
    if (!pag || this.careerHistoryLoading()) return;
    const next = Math.min(Math.max(1, pag.page + delta), pag.totalPages);
    if (next === pag.page) return;
    this.loadCareerPage(next, true);
  }

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('constructorId')?.trim() ?? '';
          if (!id) {
            this.error.set('Equipo no encontrado.');
            this.loading.set(false);
            return EMPTY;
          }
          this.lastLoadedConstructorId = '';
          return this.loadFullProfile(id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private applyProfileEmission(incoming: MotogpTeamProfile): void {
    const prev = this.profile();
    const next =
      prev && prev.source === 'db' && isLiveProfileSource(incoming.source)
        ? mergeDbWithLiveTeamProfile(prev, incoming)
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
    this.loading.set(true);
    this.careerEnriching.set(false);
    this.error.set(null);

    let sideEffectsStarted = false;

    return this.motogp.getTeamProfile(id, 1).pipe(
      tap((profile) => {
        if (!profile) return;
        this.lastLoadedConstructorId = id;
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
        this.error.set('No se pudo cargar la ficha del equipo.');
        return EMPTY;
      }),
      finalize(() => this.careerEnriching.set(false)),
      map(() => undefined),
    );
  }

  private runProfileSideEffects(id: string, profile: MotogpTeamProfile): void {
    if (!profile.aggregatesPending) return;

    this.motogp
      .getTeamProfileAggregates(id)
      .pipe(
        tap((agg) => {
          const cur = this.profile();
          if (!cur) return;
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
                championshipYears: cur.stats.championshipYears,
              }
            : agg.stats;
          this.profile.set({
            ...cur,
            stats: nextStats,
            bioText: agg.bioText?.trim() ? agg.bioText : cur.bioText,
            aggregatesPending: stillPending,
            aggregatesError: false,
            statsSource,
            careerHistoryPagination: cur.careerHistoryPagination
              ? { ...cur.careerHistoryPagination, maxPts: agg.maxCareerPts ?? cur.careerHistoryPagination.maxPts }
              : null,
          });
        }),
        catchError(() => {
          const cur = this.profile();
          if (cur) {
            this.profile.set({ ...cur, aggregatesPending: false, aggregatesError: true });
          }
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private loadCareerPage(page: number, updateUrl: boolean): void {
    const id = this.lastLoadedConstructorId;
    if (!id || !this.profile()) return;

    if (updateUrl) {
      this.scrollRestoreY = window.scrollY;
      const path = this.location.path();
      const base = path.split('?')[0];
      const q = page > 1 ? `?careerPage=${page}` : '';
      this.location.replaceState(base + q);
    }

    const gen = ++this.careerLoadGen;
    this.careerHistoryLoading.set(true);
    this.motogp
      .getTeamProfile(id, page, { liveRefresh: true })
      .pipe(
        catchError(() => EMPTY),
        finalize(() => {
          if (gen !== this.careerLoadGen) return;
          this.careerHistoryLoading.set(false);
          if (this.scrollRestoreY != null) {
            const y = this.scrollRestoreY;
            this.scrollRestoreY = null;
            requestAnimationFrame(() => window.scrollTo(0, y));
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((profile) => {
        if (!profile || gen !== this.careerLoadGen) return;
        const prev = this.profile()!;
        const merged =
          prev.source === 'db' && isLiveProfileSource(profile.source)
            ? mergeDbWithLiveTeamProfile(prev, profile)
            : { ...prev, ...profile };
        this.profile.set({
          ...merged,
          careerHistory: profile.careerHistory,
          careerHistoryPagination: profile.careerHistoryPagination,
          careerHistoryError: profile.careerHistoryError,
        });
        this.careerEnriching.set(false);
      });
  }

  goBack(): void {
    this.location.back();
  }

  driverHeadshot(d: MotogpTeamProfileDriver): string {
    return resolveDriverHeadshotUrl(
      d.driverId,
      `${d.givenName} ${d.familyName}`,
      d.headshotUrl,
      { seriesId: 'motogp' },
    );
  }

  country2ForDriver(d: MotogpTeamProfileDriver): string {
    return countryCodesFromNationality(d.nationality).alpha2;
  }

  imgError(ev: Event): void {
    const el = ev.target;
    if (el instanceof HTMLImageElement) el.style.display = 'none';
  }
}
