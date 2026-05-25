import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  computed,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReturnNavDirective } from '../../core/directives/return-nav.directive';
import { catchError, map, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Moto2LiveService } from './moto2-live.service';
import type { Moto2TeamStanding } from './moto2.types';
import { moto2TeamLogoGridClass, moto2TeamLogoUrl } from './moto2-media';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { SeriesAccentDirective } from '../../core/series/series-accent.directive';
import { countryCodesFromNationality, flagCdnUrl, teamColor } from '../drivers/drivers-shared';
import { SeriesContextService } from '../../core/series/series-context.service';

export interface Moto2TeamCard {
  pos: number;
  team: string;
  constructorId: string;
  points: number;
  wins: number;
  nationality: string;
  countryCode2: string;
  countryCode3: string;
  teamColor: string;
  imageUrl: string | null;
}

function initialsForTeam(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function buildCards(rows: Moto2TeamStanding[]): Moto2TeamCard[] {
  return rows.map((r) => {
    const { alpha2, alpha3 } = countryCodesFromNationality(r.nationality);
    return {
      pos: r.pos,
      team: r.team,
      constructorId: r.constructorId ?? '',
      points: r.points,
      wins: r.wins,
      nationality: r.nationality,
      countryCode2: alpha2,
      countryCode3: alpha3,
      teamColor: teamColor(r.team, r.teamColor),
      imageUrl: moto2TeamLogoUrl(r.constructorId, r.teamId, r.logoUrl, r.team),
    };
  });
}

@Component({
  selector: 'app-moto2-teams-page',
  standalone: true,
  imports: [AppHeaderComponent, AppSidebarComponent, RouterLink, ReturnNavDirective, SeriesAccentDirective],
  templateUrl: './moto2-teams.page.html',
  styleUrls: [
    '../calendar/f1-calendar.page.css',
    '../drivers/f1-drivers.page.css',
    '../constructors/f1-constructors.page.css',
    './moto2-team-logo.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Moto2TeamsPageComponent {
  private readonly moto2 = inject(Moto2LiveService);
  private readonly destroyRef = inject(DestroyRef);
  readonly seriesCtx = inject(SeriesContextService);

  readonly homePath = computed(() => this.seriesCtx.homePath());
  readonly accent = computed(() => this.seriesCtx.config().accent);
  readonly flagImgUrl = flagCdnUrl;
  loading = signal(true);
  error = signal<string | null>(null);
  private raw = signal<Moto2TeamStanding[]>([]);
  readonly failedTeamImg = signal<Set<string>>(new Set());

  cards = computed(() => buildCards(this.raw()));

  constructor() {
    this.fetchTeams();
  }

  cardDelay(index: number): number {
    return (index % 6) * 50;
  }

  imgError(ev: Event): void {
    const el = ev.target;
    if (el instanceof HTMLImageElement) el.style.display = 'none';
  }

  onTeamImgError(key: string): void {
    this.failedTeamImg.update((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  imgFailKey(card: Moto2TeamCard): string {
    return card.constructorId?.trim() || card.team;
  }

  initialsFor(card: Moto2TeamCard): string {
    return initialsForTeam(card.team);
  }

  cardHasDetail(card: Moto2TeamCard): boolean {
    return Boolean(card.constructorId?.trim());
  }

  teamLink(card: Moto2TeamCard): (string | number)[] {
    return this.seriesCtx.path('escuderias', card.constructorId);
  }

  teamLogoClass(card: Moto2TeamCard): string {
    return moto2TeamLogoGridClass(card.constructorId);
  }

  private fetchTeams(): void {
    this.loading.set(true);
    this.error.set(null);
    this.moto2
      .getOfficialTeamsGrid(true)
      .pipe(
        tap((rows) => {
          this.raw.set(rows);
          this.loading.set(false);
        }),
        catchError(() => {
          this.loading.set(false);
          this.error.set('No se pudo cargar la parrilla de equipos.');
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
        map(() => undefined),
      )
      .subscribe();
  }
}
