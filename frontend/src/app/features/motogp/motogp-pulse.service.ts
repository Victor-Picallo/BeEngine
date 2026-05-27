import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import type {
  JolpikaCalendarRace,
  JolpikaDriverStanding,
  JolpikaLastRace,
  JolpikaRaceResult,
  MotogpRoundSessionsPayload,
  OpenF1Session,
} from '../f1-live/f1-live.types';
import type { MotogpTeamProfile, MotogpTeamStanding } from './motogp.types';
import type { MotogpLiveFeedPayload, MotogpLiveTimingPayload } from '../motogp-live/motogp-live.types';

import type { DataSource } from '../../core/data-source';

interface SourceWrapped<T> {
  source?: DataSource;
  items: T[];
}

export interface MotogpNextRaceSession {
  name: string;
  date: string;
  time: string;
  highlight?: boolean;
  dateIso?: string;
}

export interface MotogpNextRacePayload {
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
  sessions: MotogpNextRaceSession[];
}

@Injectable({ providedIn: 'root' })
export class MotogpPulseService {
  private readonly api = inject(ApiService);
  private readonly prefix = '/motogp/pulselive';

  private driverStandings$?: Observable<SourceWrapped<JolpikaDriverStanding>>;
  private teamStandings$?: Observable<MotogpTeamStanding[]>;
  private officialTeams$?: Observable<MotogpTeamStanding[]>;

  getDriverStandingsResponse(
    forceRefresh = false,
  ): Observable<SourceWrapped<JolpikaDriverStanding>> {
    if (forceRefresh) this.driverStandings$ = undefined;
    if (!this.driverStandings$) {
      this.driverStandings$ = this.api
        .get<SourceWrapped<JolpikaDriverStanding>>(`${this.prefix}/driver-standings`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.driverStandings$;
  }

  getDriverStandings(forceRefresh = false): Observable<JolpikaDriverStanding[]> {
    return this.getDriverStandingsResponse(forceRefresh).pipe(map((res) => res.items ?? []));
  }

  getTeamStandings(forceRefresh = false): Observable<MotogpTeamStanding[]> {
    if (forceRefresh) {
      this.teamStandings$ = undefined;
      this.officialTeams$ = undefined;
    }
    if (!this.teamStandings$) {
      this.teamStandings$ = this.api
        .get<SourceWrapped<MotogpTeamStanding>>(`${this.prefix}/constructor-standings`)
        .pipe(
          map((res) => res.items ?? []),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.teamStandings$;
  }

  getOfficialTeamsGrid(forceRefresh = false): Observable<MotogpTeamStanding[]> {
    if (forceRefresh) this.officialTeams$ = undefined;
    if (!this.officialTeams$) {
      this.officialTeams$ = this.api
        .get<SourceWrapped<MotogpTeamStanding>>(`${this.prefix}/official-teams`)
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

  getNextRace(): Observable<MotogpNextRacePayload> {
    return this.api.get<MotogpNextRacePayload>(`${this.prefix}/next-race`);
  }

  getRaceResults(round: number, sessionKey = 'race'): Observable<JolpikaRaceResult> {
    const q = sessionKey ? `?session=${encodeURIComponent(sessionKey)}` : '';
    return this.api.get<JolpikaRaceResult>(`${this.prefix}/results/${round}${q}`);
  }

  getRoundSessions(round: number): Observable<MotogpRoundSessionsPayload> {
    return this.api.get<MotogpRoundSessionsPayload>(`${this.prefix}/results/${round}/sessions`);
  }

  getSessions(): Observable<OpenF1Session[]> {
    return this.api
      .get<SourceWrapped<OpenF1Session>>(`${this.prefix}/sessions`)
      .pipe(map((res) => res.items ?? []));
  }

  getLiveTiming(): Observable<MotogpLiveTimingPayload> {
    return this.api.get<MotogpLiveTimingPayload>(`${this.prefix}/live-timing`);
  }

  getLiveFeed(round?: number, sessionKey = 'race'): Observable<MotogpLiveFeedPayload> {
    const q = new URLSearchParams();
    if (round != null && round > 0) q.set('round', String(round));
    if (sessionKey) q.set('session', sessionKey);
    const qs = q.toString() ? `?${q}` : '';
    return this.api.get<MotogpLiveFeedPayload>(`${this.prefix}/live-feed${qs}`);
  }

  getTeamProfile(constructorId: string, careerPage = 1): Observable<MotogpTeamProfile> {
    const id = encodeURIComponent(constructorId.trim());
    const p = Math.max(1, careerPage);
    const q = p > 1 ? `?careerPage=${p}` : '';
    return this.api.get<MotogpTeamProfile>(`${this.prefix}/constructors/${id}/profile${q}`);
  }

  getTeamProfileAggregates(constructorId: string): Observable<{
    stats: MotogpTeamProfile['stats'];
    bioText: string;
    maxCareerPts: number;
    partial?: boolean;
  }> {
    const id = encodeURIComponent(constructorId.trim());
    return this.api.get(`${this.prefix}/constructors/${id}/profile/aggregates`);
  }
}
