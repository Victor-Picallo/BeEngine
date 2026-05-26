import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import type {
  JolpikaCalendarRace,
  JolpikaDriverStanding,
  JolpikaLastRace,
  JolpikaRaceResult,
} from '../f1-live/f1-live.types';
import type { Moto3TeamProfile, Moto3TeamStanding } from './moto3.types';
import type { MotogpRoundSessionsPayload } from '../f1-live/f1-live.types';

interface SourceWrapped<T> {
  source: string;
  items: T[];
}

export interface Moto3NextRaceSession {
  name: string;
  date: string;
  time: string;
  highlight?: boolean;
  dateIso?: string;
}

export interface Moto3NextRacePayload {
  source: string;
  event: {
    raceName: string;
    circuitName: string;
    locality: string;
    country: string;
    date: string;
    round: number;
    totalRounds: number;
    circuitSvgUrl?: string | null;
    circuitImageUrl?: string | null;
  } | null;
  sessions: Moto3NextRaceSession[];
}

@Injectable({ providedIn: 'root' })
export class Moto3LiveService {
  private readonly api = inject(ApiService);
  private readonly prefix = '/moto3/pulselive';

  private driverStandings$?: Observable<JolpikaDriverStanding[]>;
  private teamStandings$?: Observable<Moto3TeamStanding[]>;
  private officialTeams$?: Observable<Moto3TeamStanding[]>;

  getDriverStandings(forceRefresh = false): Observable<JolpikaDriverStanding[]> {
    if (forceRefresh) this.driverStandings$ = undefined;
    if (!this.driverStandings$) {
      this.driverStandings$ = this.api
        .get<SourceWrapped<JolpikaDriverStanding>>(`${this.prefix}/driver-standings`)
        .pipe(
          map((res) => res.items ?? []),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.driverStandings$;
  }

  getTeamStandings(forceRefresh = false): Observable<Moto3TeamStanding[]> {
    if (forceRefresh) {
      this.teamStandings$ = undefined;
      this.officialTeams$ = undefined;
    }
    if (!this.teamStandings$) {
      this.teamStandings$ = this.api
        .get<SourceWrapped<Moto3TeamStanding>>(`${this.prefix}/constructor-standings`)
        .pipe(
          map((res) => res.items ?? []),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.teamStandings$;
  }

  getOfficialTeamsGrid(forceRefresh = false): Observable<Moto3TeamStanding[]> {
    if (forceRefresh) this.officialTeams$ = undefined;
    if (!this.officialTeams$) {
      this.officialTeams$ = this.api
        .get<SourceWrapped<Moto3TeamStanding>>(`${this.prefix}/official-teams`)
        .pipe(
          map((res) => res.items ?? []),
          catchError(() => this.getTeamStandings(forceRefresh)),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.officialTeams$;
  }

  getCalendar(): Observable<JolpikaCalendarRace[]> {
    return this.api
      .get<SourceWrapped<JolpikaCalendarRace>>(`${this.prefix}/calendar`)
      .pipe(map((res) => res.items ?? []));
  }

  getLastRace(): Observable<JolpikaLastRace> {
    return this.api.get<JolpikaLastRace>(`${this.prefix}/last-race`);
  }

  getNextRace(): Observable<Moto3NextRacePayload> {
    return this.api.get<Moto3NextRacePayload>(`${this.prefix}/next-race`);
  }

  getRaceResults(round: number, sessionKey = 'race'): Observable<JolpikaRaceResult> {
    const q = sessionKey ? `?session=${encodeURIComponent(sessionKey)}` : '';
    return this.api.get<JolpikaRaceResult>(`${this.prefix}/results/${round}${q}`);
  }

  getRoundSessions(round: number): Observable<MotogpRoundSessionsPayload> {
    return this.api.get<MotogpRoundSessionsPayload>(`${this.prefix}/results/${round}/sessions`);
  }

  getTeamProfile(constructorId: string, careerPage = 1): Observable<Moto3TeamProfile> {
    const id = encodeURIComponent(constructorId.trim());
    const p = Math.max(1, careerPage);
    const q = p > 1 ? `?careerPage=${p}` : '';
    return this.api.get<Moto3TeamProfile>(`${this.prefix}/constructors/${id}/profile${q}`);
  }

  getTeamProfileAggregates(constructorId: string): Observable<{
    stats: Moto3TeamProfile['stats'];
    bioText: string;
    maxCareerPts: number;
    partial?: boolean;
  }> {
    const id = encodeURIComponent(constructorId.trim());
    return this.api.get(`${this.prefix}/constructors/${id}/profile/aggregates`);
  }
}
