import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, distinctUntilChanged, EMPTY, map, of, switchMap, tap } from 'rxjs';
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
  private readonly destroyRef = inject(DestroyRef);

  readonly accent = ACCENT;
  readonly flagImgUrl = flagCdnUrl;

  loading = signal(true);
  error = signal<string | null>(null);
  profile = signal<JolpikaConstructorProfile | null>(null);
  openf1Drivers = signal<OpenF1Driver[]>([]);

  teamHue = computed(() => teamColor(this.profile()?.name ?? ''));

  logoUrl = computed(() => f1TeamShowcaseImageUrl(this.profile()?.constructorId ?? ''));

  carUrl = computed(() => f1TeamCarImageUrl(this.profile()?.constructorId ?? ''));

  maxCumPts = computed(() => {
    const rows = this.profile()?.currentSeason ?? [];
    if (!rows.length) return 1;
    return Math.max(...rows.map((r) => r.cumPts), 1);
  });

  /** Escala del gráfico: usa `maxPts` del historial completo si hay paginación. */
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

  /**
   * Campeona de constructores en la UI: usa `titleWon` del backend; si no viene
   * (cliente/cache antiguos), se deriva de P1 sin coronar la temporada actual.
   */
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

  stepCareerPage(delta: number): void {
    const pag = this.profile()?.careerHistoryPagination;
    if (!pag) return;
    const next = Math.min(Math.max(1, pag.page + delta), pag.totalPages);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { careerPage: next > 1 ? next : null },
      queryParamsHandling: 'merge',
    });
  }

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        map(([params, q]) => ({
          id: params.get('constructorId')?.trim() ?? '',
          careerPage: Math.max(1, parseInt(q.get('careerPage') || '1', 10) || 1),
        })),
        distinctUntilChanged((a, b) => a.id === b.id && a.careerPage === b.careerPage),
        switchMap(({ id, careerPage }) => {
          if (!id) {
            this.loading.set(false);
            this.error.set('Escudería no indicada.');
            return EMPTY;
          }
          this.loading.set(true);
          this.error.set(null);
          this.openf1Drivers.set([]);

          return this.f1.getConstructorProfile(id, careerPage).pipe(
            catchError(() => {
              this.profile.set(null);
              this.loading.set(false);
              this.error.set('No se encontró la ficha de esta escudería.');
              return of(null);
            }),
            switchMap((profile) => {
              if (!profile) return EMPTY;
              this.profile.set(profile);
              this.loading.set(false);
              this.error.set(null);
              return this.f1.getDrivers('latest').pipe(
                tap((d) => this.openf1Drivers.set(d)),
                catchError(() => {
                  this.openf1Drivers.set([]);
                  return of(undefined);
                }),
              );
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  imgError(ev: Event): void {
    const el = ev.target;
    if (el instanceof HTMLImageElement) el.style.display = 'none';
  }
}
