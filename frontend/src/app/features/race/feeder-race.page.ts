import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, skip, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { bindSeriesLoad, isSeriesStillActive } from '../../core/series/bind-series-load';
import type { SeriesId } from '../../core/series/series.types';
import { SeriesContextService } from '../../core/series/series-context.service';
import { SeriesAccentDirective } from '../../core/series/series-accent.directive';
import { ReturnNavDirective } from '../../core/directives/return-nav.directive';
import { BackNavigationService } from '../../core/services/back-navigation.service';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { F1LiveService } from '../f1-live/f1-live.service';
import { findOfficialCircuit, projectCircuitCoords } from '../calendar/official-circuits';
import { findRaceBySlug } from './race-slug';
import { teamColor } from '../drivers/drivers-shared';
import type { JolpikaCalendarRace, JolpikaRaceResult } from '../f1-live/f1-live.types';

const GENERIC_PATH =
  'M 24 92 C 46 30 124 18 164 58 C 198 92 262 34 276 84 C 288 128 228 146 174 126 C 118 106 86 156 42 130 C 18 116 16 100 24 92 Z';

@Component({
  selector: 'app-feeder-race-page',
  standalone: true,
  imports: [
    AppHeaderComponent,
    AppSidebarComponent,
    RouterLink,
    ReturnNavDirective,
    SeriesAccentDirective,
  ],
  templateUrl: './feeder-race.page.html',
  styleUrls: ['../calendar/f1-calendar.page.css', './feeder-race.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeederRacePageComponent {
  private readonly service = inject(F1LiveService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly backNav = inject(BackNavigationService);

  readonly seriesCtx = inject(SeriesContextService);
  readonly accent = computed(() => this.seriesCtx.config().accent);

  returnUrl = signal<string | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  calendar = signal<JolpikaCalendarRace[]>([]);
  raceResult = signal<JolpikaRaceResult | null>(null);

  raceSlug = computed(() => this.route.snapshot.paramMap.get('race') ?? '');

  currentRace = computed(() => {
    const slug = this.raceSlug();
    return slug ? findRaceBySlug(this.calendar(), slug) : null;
  });

  isPast = computed(() => {
    const race = this.currentRace();
    if (!race) return false;
    const t = new Date(`${race.date}T${race.time ?? '23:59:59Z'}`);
    return Number.isFinite(t.getTime()) && t < new Date();
  });

  circuitSvg = computed(() => {
    const race = this.currentRace();
    if (!race) {
      return { circuitPath: GENERIC_PATH, viewBox: '0 0 300 170', startX: 24, startY: 92 };
    }
    return this.buildCircuitSvg(race);
  });

  podium = computed(() => {
    const results = this.raceResult()?.results ?? [];
    return results.slice(0, 3).map(r => ({
      position: r.position,
      driver: r.driver,
      team: r.team,
      teamColor: teamColor(r.team),
      time: r.time,
      driverId: r.driverId,
    }));
  });

  resultRows = computed(() => {
    const results = this.raceResult()?.results ?? [];
    return results.map(r => ({
      ...r,
      teamColor: teamColor(r.team),
    }));
  });

  dateLabel = computed(() => {
    const race = this.currentRace();
    if (!race) return '';
    const d = new Date(`${race.date}T${race.time ?? '12:00:00Z'}`);
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  });

  backLabel = computed(() =>
    this.backNav.labelFor(this.returnUrl(), this.seriesCtx.urlPath('calendario')),
  );

  constructor() {
    bindSeriesLoad((seriesId) => this.loadRace(seriesId), this.destroyRef);

    this.route.paramMap
      .pipe(
        skip(1),
        switchMap(() => this.loadRace(this.seriesCtx.id())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  goBack(): void {
    this.backNav.goBack(this.seriesCtx.path('calendario'), this.returnUrl());
  }

  positionLabel(pos: number): string {
    return pos === 1 ? '1º' : pos === 2 ? '2º' : pos === 3 ? '3º' : `${pos}º`;
  }

  positionColor(pos: number): string {
    if (pos === 1) return '#C8963E';
    if (pos === 2) return '#7A8A96';
    if (pos === 3) return '#8B5A2B';
    return '#888';
  }

  driverLink(driverId: string | null | undefined): (string | number)[] | null {
    const id = (driverId ?? '').trim();
    if (!id || id === 'unknown') return null;
    return this.seriesCtx.path('pilotos', id);
  }

  private buildCircuitSvg(race: JolpikaCalendarRace): {
    circuitPath: string;
    viewBox: string;
    startX: number;
    startY: number;
  } {
    const fallback = { circuitPath: GENERIC_PATH, viewBox: '0 0 300 170', startX: 24, startY: 92 };
    const official = findOfficialCircuit(race.circuitName) ?? findOfficialCircuit(race.locality);
    if (!official) return fallback;

    const points = projectCircuitCoords(official.coords);
    if (points.length < 3) return fallback;

    const minX = Math.min(...points.map(p => p[0]));
    const maxX = Math.max(...points.map(p => p[0]));
    const minY = Math.min(...points.map(p => p[1]));
    const maxY = Math.max(...points.map(p => p[1]));
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);
    const scale = Math.min(260 / width, 130 / height);
    const offsetX = (300 - width * scale) / 2 - minX * scale;
    const offsetY = (170 - height * scale) / 2 - minY * scale;
    const projected = points.map(([x, y]) => [x * scale + offsetX, y * scale + offsetY]);
    const [first, ...rest] = projected;
    const path = `M ${first[0].toFixed(1)} ${first[1].toFixed(1)} ${rest.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')}`;

    return {
      circuitPath: path,
      viewBox: '0 0 300 170',
      startX: Number(first[0].toFixed(1)),
      startY: Number(first[1].toFixed(1)),
    };
  }

  private loadRace(seriesId: SeriesId) {
    const slug = this.raceSlug();
    this.loading.set(true);
    this.error.set(null);
    this.calendar.set([]);
    this.raceResult.set(null);
    this.returnUrl.set(this.backNav.captureReturnUrl());

    return this.service.getCalendar(seriesId).pipe(
      switchMap(cal => {
        if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return of(null);
        this.calendar.set(cal);
        const race = findRaceBySlug(cal, slug);
        if (!race) {
          this.error.set('No hemos encontrado esta ronda en el calendario.');
          this.loading.set(false);
          return of(null);
        }
        const raceTime = new Date(`${race.date}T${race.time ?? '23:59:59Z'}`);
        const past = Number.isFinite(raceTime.getTime()) && raceTime < new Date();
        if (!past) {
          this.loading.set(false);
          return of(null);
        }
        return this.service.getRaceResults(race.round, seriesId).pipe(
          catchError(() => {
            this.error.set('Aún no hay resultados publicados para esta carrera.');
            return of(null);
          }),
        );
      }),
      tap(result => {
        if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return;
        if (result) this.raceResult.set(result);
        this.loading.set(false);
      }),
      catchError(() => {
        if (!isSeriesStillActive(seriesId, () => this.seriesCtx.id())) return of(null);
        this.error.set('No se pudo cargar la información de la carrera.');
        this.loading.set(false);
        return of(null);
      }),
      map(() => undefined),
    );
  }
}
