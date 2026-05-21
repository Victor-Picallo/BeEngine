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
import { bindSeriesLoad, isSeriesStillActive } from '../../core/series/bind-series-load';
import type { SeriesId } from '../../core/series/series.types';
import { F1LiveService } from '../f1-live/f1-live.service';
import type { JolpikaConstructorStanding } from '../f1-live/f1-live.types';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { SeriesContextService } from '../../core/series/series-context.service';
import { SeriesAccentDirective } from '../../core/series/series-accent.directive';
import {
  countryCodesFromNationality,
  flagCdnUrl,
  teamColor,
} from '../drivers/drivers-shared';
import { f1TeamShowcaseImageUrl } from './constructors-media';

export interface ConstructorCard {
  pos: number;
  team: string;
  constructorId: string;
  points: number;
  wins: number;
  nationality: string;
  countryCode2: string;
  countryCode3: string;
  teamColor: string;
  /** Imagen oficial de marca (F1.com); Jolpica no expone monoplaza. */
  imageUrl: string | null;
}

function initialsForTeam(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function buildCards(rows: JolpikaConstructorStanding[], seriesId: SeriesId): ConstructorCard[] {
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
      teamColor: teamColor(r.team),
      imageUrl: f1TeamShowcaseImageUrl(r.constructorId ?? '', seriesId),
    };
  });
}

@Component({
  selector: 'app-f1-constructors-page',
  standalone: true,
  imports: [AppHeaderComponent, AppSidebarComponent, RouterLink, ReturnNavDirective, SeriesAccentDirective],
  templateUrl: './f1-constructors.page.html',
  styleUrls: ['../calendar/f1-calendar.page.css', '../drivers/f1-drivers.page.css', './f1-constructors.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class F1ConstructorsPageComponent {
  private readonly f1 = inject(F1LiveService);
  private readonly destroyRef = inject(DestroyRef);

  readonly seriesCtx = inject(SeriesContextService);
  readonly accent = computed(() => this.seriesCtx.config().accent);
  readonly flagImgUrl = flagCdnUrl;
  loading = signal(true);
  error = signal<string | null>(null);
  private raw = signal<JolpikaConstructorStanding[]>([]);
  /** Logos que no cargan → volvemos al bloque de iniciales. */
  readonly failedTeamImg = signal<Set<string>>(new Set());

  cards = computed(() => buildCards(this.raw(), this.seriesCtx.id()));

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

  imgFailKey(card: ConstructorCard): string {
    const id = card.constructorId?.trim();
    return id || card.team;
  }

  initialsFor(card: ConstructorCard): string {
    return initialsForTeam(card.team);
  }

  cardHasDetail(card: ConstructorCard): boolean {
    return Boolean(card.constructorId?.trim());
  }

  constructor() {
    bindSeriesLoad((seriesId) => this.fetchStandings(seriesId), this.destroyRef);
  }

  private fetchStandings(seriesId: SeriesId) {
    this.loading.set(true);
    this.error.set(null);
    this.raw.set([]);

    return this.f1.getConstructorStandings(true, seriesId).pipe(
      tap((rows) => {
        if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return;
        this.raw.set(rows);
        this.loading.set(false);
        this.error.set(null);
      }),
      catchError(() => {
        if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return of(null);
        this.loading.set(false);
        this.error.set('No se pudo cargar la clasificación de escuderías.');
        return of(null);
      }),
      map(() => undefined),
    );
  }
}
