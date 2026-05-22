import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, shareReplay } from 'rxjs';
import {
  mergeOfficialTeamsGrid,
  type MotogpPulseTeam,
} from '../motogp/motogp-official-grid';
import { ApiService } from '../../core/services/api.service';
import type {
  JolpikaCalendarRace,
  JolpikaDriverStanding,
  JolpikaLastRace,
  JolpikaRaceResult,
} from '../f1-live/f1-live.types';
import type { MotogpTeamProfile, MotogpTeamStanding } from '../motogp/motogp.types';

interface SourceWrapped<T> {
  source: string;
  items: T[];
}

export interface MotoNextRaceSession {
  name: string;
  date: string;
  time: string;
  highlight?: boolean;
  dateIso?: string;
}

export interface MotoNextRacePayload {
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
  sessions: MotoNextRaceSession[];
}

@Injectable({ providedIn: 'root' })
export class MotoLiveService {
  private readonly api = inject(ApiService);
  private readonly prefix = '/motogp';

  private driverStandingsCache?: Observable<JolpikaDriverStanding[]>;
  private constructorStandingsCache?: Observable<MotogpTeamStanding[]>;
  private officialTeamsGridCache?: Observable<MotogpTeamStanding[]>;

  getDriverStandings(forceRefresh = false): Observable<JolpikaDriverStanding[]> {
    if (forceRefresh) this.driverStandingsCache = undefined;
    if (!this.driverStandingsCache) {
      this.driverStandingsCache = this.api
        .get<SourceWrapped<JolpikaDriverStanding>>(`${this.prefix}/pulselive/driver-standings`)
        .pipe(
          map((res) => res.items ?? []),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.driverStandingsCache;
  }

  getTeamStandings(forceRefresh = false): Observable<MotogpTeamStanding[]> {
    if (forceRefresh) this.constructorStandingsCache = undefined;
    if (!this.constructorStandingsCache) {
      this.constructorStandingsCache = this.api
        .get<SourceWrapped<MotogpTeamStanding>>(`${this.prefix}/pulselive/constructor-standings`)
        .pipe(
          map((res) => res.items ?? []),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.constructorStandingsCache;
  }

  /**
   * Parrilla oficial: 11 equipos (Pulse /teams) + puntos agregados.
   * No depende de /official-teams (ruta nueva); usa /teams + /constructor-standings.
   */
  getOfficialTeamsGrid(forceRefresh = false): Observable<MotogpTeamStanding[]> {
    if (forceRefresh) {
      this.officialTeamsGridCache = undefined;
      this.constructorStandingsCache = undefined;
    }
    if (!this.officialTeamsGridCache) {
      this.officialTeamsGridCache = forkJoin({
        teams: this.api.get<SourceWrapped<MotogpPulseTeam>>(`${this.prefix}/pulselive/teams`),
        standings: this.getTeamStandings(forceRefresh),
      }).pipe(
        map(({ teams, standings }) =>
          mergeOfficialTeamsGrid(teams.items ?? [], standings),
        ),
        catchError(() => of([] as MotogpTeamStanding[])),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.officialTeamsGridCache;
  }

  getCalendar(): Observable<JolpikaCalendarRace[]> {
    return this.api
      .get<SourceWrapped<JolpikaCalendarRace>>(`${this.prefix}/pulselive/calendar`)
      .pipe(map((res) => res.items ?? []));
  }

  getLastRace(): Observable<JolpikaLastRace> {
    return this.api.get<JolpikaLastRace>(`${this.prefix}/pulselive/last-race`);
  }

  getNextRace(): Observable<MotoNextRacePayload> {
    return this.api.get<MotoNextRacePayload>(`${this.prefix}/pulselive/next-race`);
  }

  getRaceResults(round: number): Observable<JolpikaRaceResult> {
    return this.api.get<JolpikaRaceResult>(`${this.prefix}/pulselive/results/${round}`);
  }

  getTeamProfile(constructorId: string, careerPage = 1): Observable<MotogpTeamProfile> {
    const id = encodeURIComponent(constructorId.trim());
    const p = Math.max(1, careerPage);
    const q = p > 1 ? `?careerPage=${p}` : '';
    return this.api.get<MotogpTeamProfile>(
      `${this.prefix}/pulselive/constructors/${id}/profile${q}`,
    );
  }

  getTeamProfileAggregates(constructorId: string): Observable<{
    stats: MotogpTeamProfile['stats'];
    bioText: string;
    maxCareerPts: number;
    partial?: boolean;
  }> {
    const id = encodeURIComponent(constructorId.trim());
    return this.api.get(`${this.prefix}/pulselive/constructors/${id}/profile/aggregates`);
  }
}
