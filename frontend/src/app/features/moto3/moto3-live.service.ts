import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { HYBRID_SHARE_REPLAY } from '../../core/profile/hybrid-dashboard.helpers';
import { ApiService } from '../../core/services/api.service';
import type {
  JolpikaCalendarRace,
  JolpikaDriverStanding,
  JolpikaLastRace,
  JolpikaRaceResult,
} from '../f1-live/f1-live.types';
import type { Moto3TeamProfile, Moto3TeamStanding } from './moto3.types';
import type { MotogpRoundSessionsPayload } from '../f1-live/f1-live.types';

import type { DataSource } from '../../core/data-source';

interface SourceWrapped<T> {
  source?: DataSource;
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

  private driverStandings$?: Observable<SourceWrapped<JolpikaDriverStanding>>;
  private teamStandings$?: Observable<Moto3TeamStanding[]>;
  private officialTeams$?: Observable<Moto3TeamStanding[]>;

  invalidateCache(): void {
    this.driverStandings$ = undefined;
    this.teamStandings$ = undefined;
    this.officialTeams$ = undefined;
  }

  getDriverStandingsResponse(
    forceRefresh = false,
  ): Observable<SourceWrapped<JolpikaDriverStanding>> {
    if (forceRefresh) this.driverStandings$ = undefined;
    if (!this.driverStandings$) {
      this.driverStandings$ = this.api
        .getDbThenLive<SourceWrapped<JolpikaDriverStanding>>(`${this.prefix}/driver-standings`)
        .pipe(shareReplay(HYBRID_SHARE_REPLAY));
    }
    return this.driverStandings$;
  }

  getDriverStandings(forceRefresh = false): Observable<JolpikaDriverStanding[]> {
    return this.getDriverStandingsResponse(forceRefresh).pipe(map((res) => res.items ?? []));
  }

  getTeamStandings(forceRefresh = false): Observable<Moto3TeamStanding[]> {
    if (forceRefresh) {
      this.teamStandings$ = undefined;
      this.officialTeams$ = undefined;
    }
    if (!this.teamStandings$) {
      this.teamStandings$ = this.api
        .getDbThenLive<SourceWrapped<Moto3TeamStanding>>(`${this.prefix}/constructor-standings`)
        .pipe(
          map((res) => res.items ?? []),
          shareReplay(HYBRID_SHARE_REPLAY),
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
          shareReplay(HYBRID_SHARE_REPLAY),
        );
    }
    return this.officialTeams$;
  }

  getCalendar(): Observable<JolpikaCalendarRace[]> {
    return this.api
      .getDbThenLive<SourceWrapped<JolpikaCalendarRace>>(`${this.prefix}/calendar`)
      .pipe(map((res) => res.items ?? []));
  }

  getLastRace(): Observable<JolpikaLastRace> {
    return this.api.getDbThenLive<JolpikaLastRace>(`${this.prefix}/last-race`);
  }

  getNextRace(): Observable<Moto3NextRacePayload> {
    return this.api.get<Moto3NextRacePayload>(`${this.prefix}/next-race`);
  }

  getRaceResults(round: number, sessionKey = 'race'): Observable<JolpikaRaceResult> {
    const q = sessionKey ? `?session=${encodeURIComponent(sessionKey)}` : '';
    return this.api.getDbThenLive<JolpikaRaceResult>(`${this.prefix}/results/${round}${q}`);
  }

  getRoundSessions(round: number): Observable<MotogpRoundSessionsPayload> {
    return this.api.getDbThenLive<MotogpRoundSessionsPayload>(
      `${this.prefix}/results/${round}/sessions`,
    );
  }

  getTeamProfile(
    constructorId: string,
    careerPage = 1,
    options?: { liveRefresh?: boolean },
  ): Observable<Moto3TeamProfile> {
    const id = encodeURIComponent(constructorId.trim());
    const p = Math.max(1, careerPage);
    const q = p > 1 ? `?careerPage=${p}` : '';
    const path = `${this.prefix}/constructors/${id}/profile${q}`;
    if (options?.liveRefresh || p > 1) {
      return this.api.get<Moto3TeamProfile>(path, { liveRefresh: true });
    }
    return this.api.getDbThenLive<Moto3TeamProfile>(path);
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
