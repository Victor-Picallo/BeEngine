import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ReturnNavDirective } from '../../core/directives/return-nav.directive';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { SeriesAccentDirective } from '../../core/series/series-accent.directive';
import { MotoContextService } from '../../core/moto/moto-context.service';
import { MotoLiveService } from '../moto-live/moto-live.service';
import type { JolpikaDriverStanding } from '../f1-live/f1-live.types';
import {
  countryCodesForDriver,
  flagCdnUrl,
  teamColor,
} from '../drivers/drivers-shared';

export interface MotoDriverCard {
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

function buildCards(rows: JolpikaDriverStanding[]): MotoDriverCard[] {
  return rows.map(j => {
    const { alpha2, alpha3 } = countryCodesForDriver(j, undefined);
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
      headshotUrl: j.headshotUrl ?? '',
    };
  });
}

function initials(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

@Component({
  selector: 'app-moto-pilotos-page',
  standalone: true,
  imports: [RouterLink, ReturnNavDirective, AppHeaderComponent, AppSidebarComponent, SeriesAccentDirective],
  templateUrl: './moto-pilotos.page.html',
  styleUrls: ['../calendar/f1-calendar.page.css', '../drivers/f1-drivers.page.css', '../drivers/driver-portrait.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotoPilotosPageComponent {
  private readonly motoLive = inject(MotoLiveService);
  private readonly destroyRef = inject(DestroyRef);
  readonly motoCtx = inject(MotoContextService);

  readonly flagImgUrl = flagCdnUrl;
  loading = signal(true);
  error = signal<string | null>(null);
  private raw = signal<JolpikaDriverStanding[]>([]);

  catLabel = computed(() => this.motoCtx.config().short);
  homePath = computed(() => this.motoCtx.homePath());
  cards = computed(() => buildCards(this.raw()));

  /** Perfiles solo disponibles en MotoGP (endpoint /pulselive/drivers/:id/profile). */
  cardHasProfile(card: MotoDriverCard): boolean {
    if (this.motoCtx.id() !== 'motogp') return false;
    return Boolean(card.driverId && card.driverId !== 'unknown');
  }

  profileLink(card: MotoDriverCard): (string | number)[] {
    return [`/${this.motoCtx.id()}`, 'pilotos', card.driverId];
  }

  cardDelay(index: number): number {
    return (index % 6) * 50;
  }

  initialsFor(card: MotoDriverCard): string {
    return initials(card.driver);
  }

  imgError(ev: Event): void {
    const el = ev.target;
    if (el instanceof HTMLImageElement) el.style.display = 'none';
  }

  photoLoaded(ev: Event): void {
    const el = ev.target;
    if (el instanceof HTMLImageElement)
      el.closest('.fd-photo-wrap')?.classList.add('fd-photo-loaded');
  }

  constructor() {
    this.fetchStandings();
  }

  private fetchStandings(): void {
    this.loading.set(true);
    this.error.set(null);
    this.motoLive.getDriverStandings(true).pipe(
      tap(rows => {
        this.raw.set(rows);
        this.loading.set(false);
      }),
      catchError(() => {
        this.error.set('No se pudo cargar la clasificación de pilotos.');
        this.loading.set(false);
        return of([] as JolpikaDriverStanding[]);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }
}
