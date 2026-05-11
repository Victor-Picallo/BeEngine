import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { F1LiveService } from '../f1-live/f1-live.service';
import { findOfficialCircuit, projectCircuitCoords } from './official-circuits';
import type { JolpikaCalendarRace, JolpikaRaceResult } from '../f1-live/f1-live.types';

interface CalendarCard {
  race: JolpikaCalendarRace;
  status: 'done' | 'next' | 'upcoming';
  description: string;
  circuitPath: string;
  viewBox: string;
  podium: { position: number; driver: string; team: string; time: string | null }[];
}

const GENERIC_PATH = 'M 24 92 C 46 30 124 18 164 58 C 198 92 262 34 276 84 C 288 128 228 146 174 126 C 118 106 86 156 42 130 C 18 116 16 100 24 92 Z';

const CIRCUIT_DESCRIPTIONS: Record<string, string> = {
  'albert park circuit': 'Albert Park combina frenadas fuertes con secciones rápidas entre muros y parques. Es un circuito donde la tracción y la confianza al atacar pianos marcan diferencias.',
  'bahrain international circuit': 'Sakhir premia la estabilidad en frenada y la gestión térmica. Sus rectas largas abren adelantamientos, pero la arena y el viento cambian el agarre vuelta a vuelta.',
  'jeddah corniche circuit': 'Jeddah es una pista urbana de altísima velocidad, estrecha y exigente. La precisión en los cambios de dirección es clave para sobrevivir cerca de los muros.',
  'miami international autodrome': 'Miami mezcla rectas largas, curvas técnicas y una zona lenta donde se gana o se pierde tracción. El calor suele convertir la degradación en protagonista.',
  'autodromo enzo e dino ferrari': 'Imola es old school: estrecho, ondulado y con pianos que castigan. Adelantar cuesta, así que la clasificación y la estrategia tienen mucho peso.',
  'circuit de monaco': 'Mónaco es precisión pura. Sus calles no perdonan errores, y cada vuelta exige ritmo, paciencia y una confianza absoluta en el coche.',
  'circuit de barcelona catalunya': 'Barcelona es el examen aerodinámico clásico: curvas largas, cambios de apoyo y una última sección donde la tracción condiciona la recta principal.',
  'circuit gilles villeneuve': 'Montreal alterna chicanes agresivas y largas rectas. Los frenos sufren mucho y el famoso muro de los campeones siempre espera un exceso de ambición.',
  'red bull ring': 'Spielberg es corto, rápido y muy sensible a los límites de pista. Pocas curvas, mucha pendiente y frenadas que invitan a pelear posición.',
  'silverstone circuit': 'Silverstone es fluidez a alta velocidad. Maggotts, Becketts y Chapel prueban la carga aerodinámica y el valor del piloto a fondo.',
  'circuit de spa francorchamps': 'Spa mezcla velocidad, desnivel y clima imprevisible. Eau Rouge, Raidillon y Blanchimont siguen siendo referencias de compromiso y valentía.',
  'hungaroring': 'El Hungaroring es revirado y físico, casi sin descanso. Adelantar es difícil, así que la gestión de neumáticos y el ritmo en aire limpio son decisivos.',
  'circuit zandvoort': 'Zandvoort es estrecho, ondulado y con peraltes muy reconocibles. Exige un coche ágil y pilotos capaces de sostener velocidad con poca escapatoria.',
  'autodromo nazionale di monza': 'Monza es el templo de la velocidad. Rectas enormes, poca carga y frenadas críticas hacen que cada kilómetro por hora cuente.',
  'baku city circuit': 'Bakú combina una recta interminable con una zona antigua estrechísima. Puede ser ordenado durante vueltas y caótico en cuestión de segundos.',
  'marina bay street circuit': 'Singapur es una carrera de resistencia mental y física. Muros cercanos, calor y ritmo nocturno hacen que la concentración valga oro.',
  'circuit of the americas': 'COTA tiene desnivel, curvas enlazadas y varias zonas de adelantamiento. La primera curva cuesta arriba suele ordenar el drama desde el inicio.',
  'autodromo hermanos rodriguez': 'México se corre a gran altitud, con menos carga efectiva y una recta principal enorme. El estadio aporta una atmósfera única al final de la vuelta.',
  'autodromo jose carlos pace': 'Interlagos es corto, intenso y ondulado. Sus cambios de elevación y clima variable suelen producir carreras abiertas hasta la última vuelta.',
  'las vegas street circuit': 'Las Vegas es una pista urbana de baja carga y mucha velocidad. La temperatura nocturna hace que calentar neumáticos sea parte del reto.',
  'losail international circuit': 'Losail fluye con curvas medias y rápidas bajo los focos. La arena, el viento y la degradación lateral suelen condicionar el ritmo.',
  'yas marina circuit': 'Yas Marina combina zonas técnicas con largas rectas de DRS. Su versión moderna favorece carreras más fluidas y estrategias variadas.',
};

const normalize = (value: string) =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

@Component({
  selector: 'app-f1-calendar-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './f1-calendar.page.html',
  styleUrl: './f1-calendar.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class F1CalendarPageComponent implements OnInit {
  private readonly service = inject(F1LiveService);

  loading = signal(true);
  error = signal<string | null>(null);
  calendar = signal<JolpikaCalendarRace[]>([]);
  resultsByRound = signal<Record<number, JolpikaRaceResult>>({});
  today = signal(new Date().toISOString().slice(0, 10));

  totalRounds = computed(() => this.calendar().length);
  completedRounds = computed(() => this.calendar().filter(r => this.isPastRace(r)).length);
  nextRace = computed(() => this.calendar().find(r => !this.isPastRace(r)) ?? null);

  cards = computed<CalendarCard[]>(() => {
    const results = this.resultsByRound();
    const nextRound = this.nextRace()?.round ?? null;

    return this.calendar().map(race => {
      const done = this.isPastRace(race);
      const status = done ? 'done' : race.round === nextRound ? 'next' : 'upcoming';
      const result = results[race.round];
      return {
        race,
        status,
        description: this.descriptionFor(race),
        ...this.circuitSvg(race),
        podium: result?.results
          ?.slice(0, 3)
          .map(r => ({ position: r.position, driver: r.driver, team: r.team, time: r.time }))
          ?? [],
      };
    });
  });

  ngOnInit(): void {
    this.service.getCalendar().subscribe({
      next: calendar => {
        this.calendar.set(calendar);
        this.loading.set(false);
        this.loadCompletedResults(calendar);
      },
      error: () => {
        this.error.set('No se pudo cargar el calendario oficial.');
        this.loading.set(false);
      },
    });
  }

  formatRaceDate(race: JolpikaCalendarRace): string {
    const date = new Date(`${race.date}T${race.time ?? '00:00:00Z'}`);
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(date);
  }

  statusLabel(status: CalendarCard['status']): string {
    if (status === 'done') return 'Finalizada';
    if (status === 'next') return 'Próxima';
    return 'Pendiente';
  }

  private loadCompletedResults(calendar: JolpikaCalendarRace[]): void {
    const completed = calendar.filter(race => this.isPastRace(race));
    if (!completed.length) return;

    const requests = completed.map(race =>
      this.service.getRaceResults(race.round).pipe(catchError(() => of(null)))
    );

    forkJoin(requests).subscribe(results => {
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
    return Number.isFinite(raceDate.getTime())
      ? raceDate < new Date()
      : race.date < this.today();
  }

  private descriptionFor(race: JolpikaCalendarRace): string {
    return CIRCUIT_DESCRIPTIONS[normalize(race.circuitName)]
      ?? CIRCUIT_DESCRIPTIONS[normalize(race.locality)]
      ?? `${race.circuitName} reta a los equipos con un equilibrio propio entre velocidad, tracción y gestión de neumáticos durante el fin de semana.`;
  }

  private circuitSvg(race: JolpikaCalendarRace): { circuitPath: string; viewBox: string } {
    const official = findOfficialCircuit(race.circuitName) ?? findOfficialCircuit(race.locality);
    if (!official) return { circuitPath: GENERIC_PATH, viewBox: '0 0 300 170' };

    const points = projectCircuitCoords(official.coords);
    if (points.length < 3) return { circuitPath: GENERIC_PATH, viewBox: '0 0 300 170' };

    const minX = Math.min(...points.map(p => p[0]));
    const maxX = Math.max(...points.map(p => p[0]));
    const minY = Math.min(...points.map(p => p[1]));
    const maxY = Math.max(...points.map(p => p[1]));
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);
    const scale = Math.min(260 / width, 130 / height);
    const offsetX = (300 - width * scale) / 2 - minX * scale;
    const offsetY = (170 - height * scale) / 2 - minY * scale;
    const [first, ...rest] = points.map(([x, y]) => [x * scale + offsetX, y * scale + offsetY]);
    const path = `M ${first[0].toFixed(1)} ${first[1].toFixed(1)} ${rest.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')}`;

    return { circuitPath: path, viewBox: '0 0 300 170' };
  }
}
