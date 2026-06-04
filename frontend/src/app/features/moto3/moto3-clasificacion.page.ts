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
import { catchError, of } from 'rxjs';
import {
  mergeHybridSources,
  startHybridLoad,
} from '../../core/profile/hybrid-dashboard.helpers';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Moto3LiveService } from './moto3-live.service';
import type {
  JolpikaCalendarRace,
  JolpikaDriverStanding,
  JolpikaLastRace,
  JolpikaRaceResult,
} from '../f1-live/f1-live.types';
import type { Moto3TeamStanding } from './moto3.types';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { SeriesAccentDirective } from '../../core/series/series-accent.directive';
import { SeriesContextService } from '../../core/series/series-context.service';
import { mergeDataSources, type DataSource } from '../../core/data-source';
import { DataSourceBadgeComponent } from '../../shared/components/data-source-badge/data-source-badge.component';
import {
  buildDriverRows,
  ClDriverRow,
  seasonProgress,
  sparklineLastDot,
  sparklinePoints,
} from '../standings/clasificacion-build';
import { buildMoto3TeamRows, Moto3TeamClRow } from './moto3-clasificacion-build';
import { moto3TeamLogoCardClass } from './moto3-media';

@Component({
  selector: 'app-moto3-clasificacion-page',
  standalone: true,
  imports: [
    AppHeaderComponent,
    AppSidebarComponent,
    RouterLink,
    ReturnNavDirective,
    SeriesAccentDirective,
    DataSourceBadgeComponent,
  ],
  templateUrl: './moto3-clasificacion.page.html',
  styleUrls: [
    '../standings/f1-clasificacion.page.css',
    '../drivers/driver-portrait.css',
    './moto3-team-logo.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Moto3ClasificacionPageComponent {
  private readonly moto3 = inject(Moto3LiveService);
  private readonly destroyRef = inject(DestroyRef);
  readonly seriesCtx = inject(SeriesContextService);

  readonly homePath = computed(() => this.seriesCtx.homePath());
  readonly accent = computed(() => this.seriesCtx.config().accent);

  seriesLink(...segments: string[]): (string | number)[] {
    return this.seriesCtx.path(...segments);
  }

  teamProfileLink(c: Moto3TeamClRow): (string | number)[] | null {
    return c.constructorId ? this.seriesLink('escuderias', c.constructorId) : null;
  }

  driverProfileLink(d: ClDriverRow): (string | number)[] | null {
    return d.driverId ? this.seriesLink('pilotos', d.driverId) : null;
  }

  loading = signal(true);
  error = signal<string | null>(null);
  dataSource = signal<DataSource | null>(null);
  view = signal<'drivers' | 'constructors'>('drivers');
  private failedTeamImg = signal(new Set<string>());

  private driverStands = signal<JolpikaDriverStanding[]>([]);
  private teamStands = signal<Moto3TeamStanding[]>([]);
  private races = signal<JolpikaRaceResult[]>([]);
  private calendar = signal<JolpikaCalendarRace[]>([]);
  private lastRace = signal<JolpikaLastRace | null>(null);

  driverRows = computed(() =>
    buildDriverRows(this.driverStands(), [], this.races(), {
      headshotSize: 'card',
      seriesId: 'moto3',
    }),
  );

  teamRows = computed(() =>
    buildMoto3TeamRows(
      this.teamStands(),
      this.driverStands().map((d) => ({ team: d.team, driver: d.driver })),
    ),
  );

  leader = computed(() => this.driverRows()[0] ?? null);
  teamLeader = computed(() => this.teamRows()[0] ?? null);
  season = computed(() => seasonProgress(this.calendar(), this.lastRace()));

  legendLastGp = computed(() => {
    const lr = this.lastRace();
    if (!lr) return '';
    return `Ronda ${lr.round} de ${this.season().total} · ${lr.raceName} fue la última carrera`;
  });

  constructor() {
    this.fetchStandings();
  }

  private fetchStandings(): void {
    this.loading.set(true);
    this.error.set(null);
    this.races.set([]);

    let lastRace: JolpikaLastRace | null = null;

    startHybridLoad(
      [
        {
          load: () =>
            this.moto3.getDriverStandingsResponse(true).pipe(
              catchError(() => of({ items: [] as JolpikaDriverStanding[], source: undefined })),
            ),
          onValue: (res) => {
            const r = res as { items?: JolpikaDriverStanding[] };
            this.driverStands.set(r.items ?? []);
          },
        },
        {
          load: () =>
            this.moto3.getOfficialTeamsGrid(true).pipe(
              catchError(() => of([] as Moto3TeamStanding[])),
            ),
          onValue: (teams) => this.teamStands.set(teams as Moto3TeamStanding[]),
        },
        {
          load: () =>
            this.moto3.getCalendar().pipe(catchError(() => of([] as JolpikaCalendarRace[]))),
          onValue: (calendar) => this.calendar.set(calendar as JolpikaCalendarRace[]),
        },
        {
          load: () =>
            this.moto3.getLastRace().pipe(catchError(() => of(null as JolpikaLastRace | null))),
          onValue: (lr) => {
            lastRace = lr as JolpikaLastRace | null;
            this.lastRace.set(lastRace);
          },
        },
      ],
      {
        isActive: () => true,
        onReady: () => this.loading.set(false),
        onSources: (sources) => this.dataSource.set(mergeHybridSources(sources)),
        onAllSettled: () => this.loadRaceEnrichment(lastRace),
      },
    );
  }

  private loadRaceEnrichment(lastRace: JolpikaLastRace | null): void {
    const rounds = lastRace?.round
      ? Array.from({ length: lastRace.round }, (_, i) => i + 1)
      : [];
    if (!rounds.length) return;

    for (const round of rounds) {
      this.moto3
        .getRaceResults(round)
        .pipe(
          catchError(() => of(null as JolpikaRaceResult | null)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((result) => {
          if (!result) return;
          this.races.update((prev) => {
            const next = prev.filter((r) => r.round !== result.round);
            next.push(result);
            return next.sort((a, b) => a.round - b.round);
          });
        });
    }
  }

  setView(v: 'drivers' | 'constructors'): void {
    this.view.set(v);
  }

  rowDelay(index: number): number {
    return Math.min(index * 30, 300);
  }

  posColor(pos: number): string {
    if (pos === 1) return '#C8963E';
    if (pos === 2) return '#7A8A96';
    if (pos === 3) return '#8B5A2B';
    return '#bbb';
  }

  sparkPts(d: ClDriverRow): string {
    return sparklinePoints(d.cumPts);
  }

  sparkDot(d: ClDriverRow): { cx: number; cy: number } | null {
    return sparklineLastDot(d.cumPts);
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  leaderDisplayName(d: ClDriverRow): string {
    return `${d.first[0] ?? ''}. ${d.last}`;
  }

  teamLeaderDisplayName(c: Moto3TeamClRow): string {
    return c.team.toUpperCase();
  }

  imgError(ev: Event, _row?: ClDriverRow): void {
    const el = ev.target;
    if (el instanceof HTMLImageElement) el.style.display = 'none';
  }

  photoLoaded(ev: Event): void {
    const el = ev.target;
    if (el instanceof HTMLImageElement)
      el.closest('.cl-photo-wrap')?.classList.add('cl-photo-loaded');
  }

  teamImgKey(c: Moto3TeamClRow): string {
    return c.constructorId ?? c.team;
  }

  teamLogoImage(c: Moto3TeamClRow): string | null {
    const key = this.teamImgKey(c);
    if (this.failedTeamImg().has(key)) return null;
    return c.logoImageUrl;
  }

  teamLogoClass(c: Moto3TeamClRow): string {
    return `cl-const-car-img ${moto3TeamLogoCardClass(c.constructorId)}`;
  }

  teamImgError(c: Moto3TeamClRow): void {
    this.failedTeamImg.update((s) => new Set(s).add(this.teamImgKey(c)));
  }

  seasonDots(): number[] {
    return Array.from({ length: this.season().total }, (_, i) => i);
  }
}
