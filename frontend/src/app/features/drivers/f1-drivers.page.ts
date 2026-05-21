import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReturnNavDirective } from '../../core/directives/return-nav.directive';
import { catchError, forkJoin, map, of, tap } from 'rxjs';
import { bindSeriesLoad, isSeriesStillActive } from '../../core/series/bind-series-load';
import { isFeederSeries } from '../../core/series/series.config';
import type { SeriesId } from '../../core/series/series.types';
import { F1LiveService } from '../f1-live/f1-live.service';
import type { JolpikaDriverStanding, OpenF1Driver } from '../f1-live/f1-live.types';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { SeriesContextService } from '../../core/series/series-context.service';
import { SeriesAccentDirective } from '../../core/series/series-accent.directive';
import {
  countryCodesForDriver,
  flagCdnUrl as driverFlagCdnUrl,
  normalize,
  resolveDriverHeadshotRawUrl,
  resolveDriverHeadshotUrl,
  teamColor,
} from './drivers-shared';

export interface DriverCard {
  pos: number;
  driver: string;
  driverId: string;
  team: string;
  points: number;
  wins: number;
  countryCode2: string;
  countryCode3: string;
  teamColor: string;
  headshotUrl: string;
}

function initials(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function matchOpenF1Driver(
  j: JolpikaDriverStanding,
  open: OpenF1Driver[],
): OpenF1Driver | undefined {
  if (!open.length) return undefined;
  const jn = normalize(j.driver);
  const jTeam = normalize(j.team);
  const jLast = jn.split(/\s+/).pop() ?? '';

  const exact = open.find(o => normalize(o.fullName) === jn);
  if (exact) return exact;

  return open.find(o => {
    const fn = normalize(o.fullName);
    const parts = fn.split(/\s+/);
    const oLast = parts[parts.length - 1] ?? '';
    return oLast === jLast && normalize(o.teamName) === jTeam;
  });
}

function buildCards(
  rows: JolpikaDriverStanding[],
  open: OpenF1Driver[],
  seriesId: SeriesId,
): DriverCard[] {
  return rows.map(j => {
    const o = matchOpenF1Driver(j, open);
    const url = resolveDriverHeadshotUrl(
      j.driverId ?? '',
      j.driver,
      j.headshotUrl ?? o?.headshotUrl,
      { size: 'card', seriesId },
    );
    const { alpha2, alpha3 } = countryCodesForDriver(j, o);
    return {
      pos: j.pos,
      driver: j.driver,
      driverId: j.driverId ?? '',
      team: j.team,
      points: j.points,
      wins: j.wins,
      countryCode2: alpha2,
      countryCode3: alpha3,
      teamColor: teamColor(j.team, j.teamColor),
      headshotUrl: url,
    };
  });
}

@Component({
  selector: 'app-f1-drivers-page',
  standalone: true,
  imports: [AppHeaderComponent, AppSidebarComponent, RouterLink, ReturnNavDirective, SeriesAccentDirective],
  templateUrl: './f1-drivers.page.html',
  styleUrls: ['../calendar/f1-calendar.page.css', './f1-drivers.page.css', './driver-portrait.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class F1DriversPageComponent {
  private readonly f1 = inject(F1LiveService);
  private readonly destroyRef = inject(DestroyRef);

  readonly seriesCtx = inject(SeriesContextService);
  readonly accent = computed(() => this.seriesCtx.config().accent);
  readonly flagImgUrl = driverFlagCdnUrl;
  loading = signal(true);
  error = signal<string | null>(null);
  private raw = signal<JolpikaDriverStanding[]>([]);
  private openf1Drivers = signal<OpenF1Driver[]>([]);

  cards = computed(() => buildCards(this.raw(), this.openf1Drivers(), this.seriesCtx.id()));

  cardDelay(index: number): number {
    return (index % 6) * 50;
  }

  imgError(ev: Event, card?: DriverCard): void {
    const el = ev.target;
    if (!(el instanceof HTMLImageElement)) return;
    const sid = this.seriesCtx.id();
    if (card && isFeederSeries(sid) && !el.dataset['f2Retry']) {
      const raw = resolveDriverHeadshotRawUrl(card.driverId, sid);
      if (raw) {
        el.dataset['f2Retry'] = '1';
        el.src = raw;
        return;
      }
    }
    el.style.display = 'none';
  }

  photoLoaded(ev: Event): void {
    const el = ev.target;
    if (!(el instanceof HTMLImageElement)) return;
    el.closest('.fd-photo-wrap')?.classList.add('fd-photo-loaded');
  }

  cardHasProfile(card: DriverCard): boolean {
    return Boolean(card.driverId && card.driverId !== 'unknown');
  }

  constructor() {
    bindSeriesLoad((seriesId) => this.fetchStandings(seriesId), this.destroyRef);
  }

  private fetchStandings(seriesId: SeriesId) {
    this.loading.set(true);
    this.error.set(null);
    this.raw.set([]);
    this.openf1Drivers.set([]);

    return forkJoin({
      standings: this.f1.getDriverStandings(true, seriesId),
      open: this.f1.getDrivers('latest', seriesId).pipe(catchError(() => of<OpenF1Driver[]>([]))),
    }).pipe(
      tap((res) => {
        if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return;
        this.raw.set(res.standings);
        this.openf1Drivers.set(res.open);
        this.loading.set(false);
        this.error.set(null);
        if (isFeederSeries(seriesId) || seriesId === 'motogp') this.prefetchPortraits(seriesId);
      }),
      catchError(() => {
        if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return of(null);
        this.loading.set(false);
        this.error.set('No se pudo cargar la clasificación de pilotos.');
        return of(null);
      }),
      map(() => undefined),
    );
  }

  initialsFor(card: DriverCard): string {
    return initials(card.driver);
  }

  private prefetchPortraits(seriesId: SeriesId): void {
    for (const card of buildCards(this.raw(), [], seriesId)) {
      if (!card.headshotUrl) continue;
      const img = new Image();
      img.src = card.headshotUrl;
    }
  }
}
