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
import { MotoLiveService } from '../moto-live/moto-live.service';
import type { MotogpTeamStanding } from './motogp.types';
import { motogpTeamLogoUrl } from './motogp-media';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { SeriesAccentDirective } from '../../core/series/series-accent.directive';
import { countryCodesFromNationality, flagCdnUrl, teamColor } from '../drivers/drivers-shared';
import { MotoContextService } from '../../core/moto/moto-context.service';

export interface MotogpTeamCard {
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

function buildCards(rows: MotogpTeamStanding[]): MotogpTeamCard[] {
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
      imageUrl: motogpTeamLogoUrl(r.constructorId, r.teamId, r.logoUrl, r.team),
    };
  });
}

@Component({
  selector: 'app-motogp-teams-page',
  standalone: true,
  imports: [AppHeaderComponent, AppSidebarComponent, RouterLink, ReturnNavDirective, SeriesAccentDirective],
  templateUrl: './motogp-teams.page.html',
  styleUrls: [
    '../calendar/f1-calendar.page.css',
    '../drivers/f1-drivers.page.css',
    '../constructors/f1-constructors.page.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotogpTeamsPageComponent {
  private readonly moto = inject(MotoLiveService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly motoCtx = inject(MotoContextService);

  readonly homePath = computed(() => this.motoCtx.homePath());
  readonly accent = computed(() => this.motoCtx.config().accent);
  readonly flagImgUrl = flagCdnUrl;
  loading = signal(true);
  error = signal<string | null>(null);
  private raw = signal<MotogpTeamStanding[]>([]);
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

  imgFailKey(card: MotogpTeamCard): string {
    return card.constructorId?.trim() || card.team;
  }

  initialsFor(card: MotogpTeamCard): string {
    return initialsForTeam(card.team);
  }

  cardHasDetail(card: MotogpTeamCard): boolean {
    return Boolean(card.constructorId?.trim());
  }

  teamLink(card: MotogpTeamCard): string[] {
    return [`/${this.motoCtx.id()}`, 'escuderias', card.constructorId];
  }

  teamLogoClass(card: MotogpTeamCard): string {
    const base = 'fc-team-showcase-img';
    return card.constructorId === 'honda-hrc-castrol' ? `${base} fc-team-showcase-img--sm` : base;
  }

  private fetchTeams(): void {
    this.loading.set(true);
    this.error.set(null);
    this.moto
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
