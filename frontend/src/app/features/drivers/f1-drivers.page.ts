import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { F1LiveService } from '../f1-live/f1-live.service';
import type { JolpikaDriverStanding, OpenF1Driver } from '../f1-live/f1-live.types';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import {
  ACCENT,
  countryCodesForDriver,
  flagCdnUrl as driverFlagCdnUrl,
  normalize,
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

function buildCards(rows: JolpikaDriverStanding[], open: OpenF1Driver[]): DriverCard[] {
  return rows.map(j => {
    const o = matchOpenF1Driver(j, open);
    const url = resolveDriverHeadshotUrl(j.driverId ?? '', j.driver, o?.headshotUrl);
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
      teamColor: teamColor(j.team),
      headshotUrl: url,
    };
  });
}

@Component({
  selector: 'app-f1-drivers-page',
  standalone: true,
  imports: [AppHeaderComponent, AppSidebarComponent, RouterLink],
  templateUrl: './f1-drivers.page.html',
  styleUrls: ['../calendar/f1-calendar.page.css', './f1-drivers.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class F1DriversPageComponent implements OnInit {
  private readonly f1 = inject(F1LiveService);
  private readonly destroyRef = inject(DestroyRef);

  readonly accent = ACCENT;
  readonly flagImgUrl = driverFlagCdnUrl;
  loading = signal(true);
  error = signal<string | null>(null);
  private raw = signal<JolpikaDriverStanding[]>([]);
  private openf1Drivers = signal<OpenF1Driver[]>([]);

  cards = computed(() => buildCards(this.raw(), this.openf1Drivers()));

  cardDelay(index: number): number {
    return (index % 6) * 50;
  }

  imgError(ev: Event): void {
    const el = ev.target;
    if (el instanceof HTMLImageElement) el.style.display = 'none';
  }

  cardHasProfile(card: DriverCard): boolean {
    return Boolean(card.driverId && card.driverId !== 'unknown');
  }

  ngOnInit(): void {
    forkJoin({
      standings: this.f1.getDriverStandings(),
      openf1: this.f1.getDrivers('latest').pipe(catchError(() => of<OpenF1Driver[]>([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ standings, openf1 }) => {
          this.raw.set(standings);
          this.openf1Drivers.set(openf1);
          this.loading.set(false);
          this.error.set(null);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudo cargar la clasificación de pilotos.');
        },
      });
  }

  initialsFor(card: DriverCard): string {
    return initials(card.driver);
  }
}
