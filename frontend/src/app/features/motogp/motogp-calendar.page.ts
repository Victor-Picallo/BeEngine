import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { catchError, forkJoin, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ReturnNavDirective } from '../../core/directives/return-nav.directive';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { SeriesAccentDirective } from '../../core/series/series-accent.directive';
import { SeriesContextService } from '../../core/series/series-context.service';
import { MotogpPulseService } from './motogp-pulse.service';
import type { JolpikaCalendarRace, JolpikaRaceResult } from '../f1-live/f1-live.types';
import { defaultMotogpSession } from '../race/motogp-session';
import { slugifyRace } from '../race/race-slug';
import { teamColor } from '../drivers/drivers-shared';
import { motoRaceHasCircuitMap } from './moto-calendar-circuit.util';
import { MotoCircuitCardMapComponent } from './moto-circuit-card-map.component';

type CalendarFilter = 'all' | 'completed' | 'upcoming';

interface MotoCalendarCard {
  race: JolpikaCalendarRace;
  status: 'done' | 'next' | 'upcoming';
  hasCircuitMap: boolean;
  dateLabel: string;
  slug: string;
  defaultSession: string;
  podium: { position: number; driver: string; team: string; teamColor: string; time: string | null }[];
}

interface MonthGroup {
  month: string;
  races: MotoCalendarCard[];
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-motogp-calendar-page',
  standalone: true,
  imports: [
    RouterLink,
    ReturnNavDirective,
    AppHeaderComponent,
    AppSidebarComponent,
    SeriesAccentDirective,
    MotoCircuitCardMapComponent,
  ],
  templateUrl: './motogp-calendar.page.html',
  styleUrl: '../calendar/f1-calendar.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotogpCalendarPageComponent {
  private readonly motogpPulse = inject(MotogpPulseService);
  private readonly destroyRef = inject(DestroyRef);
  readonly seriesCtx = inject(SeriesContextService);

  loading = signal(true);
  error = signal<string | null>(null);
  calendar = signal<JolpikaCalendarRace[]>([]);
  resultsByRound = signal<Record<number, JolpikaRaceResult>>({});
  filter = signal<CalendarFilter>('all');

  catLabel = computed(() => this.seriesCtx.config().short);
  homePath = computed(() => this.seriesCtx.homePath());

  totalRounds = computed(() => this.calendar().length);
  completedRounds = computed(() => this.calendar().filter(r => this.isPastRace(r)).length);
  remainingRounds = computed(() => this.totalRounds() - this.completedRounds());
  progressPct = computed(() => {
    const total = this.totalRounds();
    if (!total) return 0;
    return Math.round((this.completedRounds() / total) * 100);
  });
  nextRace = computed(() => this.calendar().find(r => !this.isPastRace(r)) ?? null);
  nextRaceDateLabel = computed(() => {
    const race = this.nextRace();
    return race ? this.formatLongDate(race) : '';
  });

  allCards = computed<MotoCalendarCard[]>(() => {
    const results = this.resultsByRound();
    const nextRound = this.nextRace()?.round ?? null;
    return this.calendar().map(race => {
      const done = this.isPastRace(race);
      const status: MotoCalendarCard['status'] =
        done ? 'done' : race.round === nextRound ? 'next' : 'upcoming';
      const result = results[race.round];
      return {
        race,
        status,
        hasCircuitMap: motoRaceHasCircuitMap(race),
        dateLabel: this.formatRaceDate(race),
        slug: slugifyRace(race),
        defaultSession: defaultMotogpSession(race),
        podium: result?.results?.slice(0, 3).map(r => ({
          position: r.position,
          driver: r.driver,
          team: r.team,
          teamColor: teamColor(r.team, r.teamColor ?? undefined),
          time: r.time ?? null,
        })) ?? [],
      };
    });
  });

  filteredCards = computed<MotoCalendarCard[]>(() => {
    const f = this.filter();
    const cards = this.allCards();
    if (f === 'completed') return cards.filter(c => c.status === 'done');
    if (f === 'upcoming') return cards.filter(c => c.status !== 'done');
    return cards;
  });

  monthGroups = computed<MonthGroup[]>(() => {
    const groups: MonthGroup[] = [];
    const index: Record<string, MonthGroup> = {};
    for (const card of this.filteredCards()) {
      const m = MONTHS[new Date(card.race.date).getMonth()];
      if (!index[m]) {
        index[m] = { month: m, races: [] };
        groups.push(index[m]);
      }
      index[m].races.push(card);
    }
    return groups;
  });

  progressDots = computed(() =>
    this.allCards().map(c => ({ round: c.race.round, status: c.status, name: c.race.raceName })),
  );

  constructor() {
    this.fetchCalendar();
  }

  raceCardLink(card: MotoCalendarCard): (string | number)[] {
    return [`/${this.seriesCtx.id()}`, 'calendario', card.slug, card.defaultSession];
  }

  setFilter(filter: CalendarFilter): void {
    this.filter.set(filter);
  }

  cardDelay(index: number): number {
    return (index % 6) * 50;
  }

  formatRaceDate(race: JolpikaCalendarRace): string {
    const date = new Date(`${race.date}T${race.time ?? '00:00:00Z'}`);
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' })
      .format(date).replace('.', '').toUpperCase();
  }

  formatLongDate(race: JolpikaCalendarRace): string {
    const date = new Date(`${race.date}T${race.time ?? '00:00:00Z'}`);
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(date);
  }

  positionLabel(pos: number): string {
    if (pos === 1) return '1º';
    if (pos === 2) return '2º';
    return '3º';
  }

  positionColor(pos: number): string {
    if (pos === 1) return '#C8963E';
    if (pos === 2) return '#7A8A96';
    return '#8B5A2B';
  }

  private fetchCalendar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.motogpPulse.getCalendar().pipe(
      tap(calendar => {
        this.calendar.set(calendar);
        this.loading.set(false);
        this.loadCompletedResults(calendar);
      }),
      catchError(() => {
        this.error.set('No se pudo cargar el calendario.');
        this.loading.set(false);
        return of([] as JolpikaCalendarRace[]);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  private loadCompletedResults(calendar: JolpikaCalendarRace[]): void {
    const completed = calendar.filter(r => this.isPastRace(r));
    if (!completed.length) return;
    forkJoin(
      completed.map(race =>
        this.motogpPulse.getRaceResults(race.round).pipe(
          catchError(() => of(null as JolpikaRaceResult | null)),
        ),
      ),
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(results => {
      const byRound: Record<number, JolpikaRaceResult> = {};
      for (const result of results) {
        if (result) byRound[result.round] = result;
      }
      this.resultsByRound.set(byRound);
    });
  }

  private isPastRace(race: JolpikaCalendarRace): boolean {
    const raceTime = race.time ?? '23:59:59Z';
    const raceDate = new Date(`${race.date}T${raceTime}`);
    return Number.isFinite(raceDate.getTime()) ? raceDate < new Date() : false;
  }
}
