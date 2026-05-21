import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import type {
  JolpikaCalendarRace,
  JolpikaConstructorStanding,
  JolpikaDriverStanding,
  JolpikaLastRace,
} from '../f1-live/f1-live.types';

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
  } | null;
  sessions: MotoNextRaceSession[];
}

@Injectable({ providedIn: 'root' })
export class MotoLiveService {
  private readonly api = inject(ApiService);
  private readonly prefix = '/motogp';

  private driverStandingsCache?: Observable<JolpikaDriverStanding[]>;
  private constructorStandingsCache?: Observable<JolpikaConstructorStanding[]>;

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

  getConstructorStandings(forceRefresh = false): Observable<JolpikaConstructorStanding[]> {
    if (forceRefresh) this.constructorStandingsCache = undefined;
    if (!this.constructorStandingsCache) {
      this.constructorStandingsCache = this.api
        .get<SourceWrapped<JolpikaConstructorStanding>>(`${this.prefix}/pulselive/constructor-standings`)
        .pipe(
          map((res) => res.items ?? []),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.constructorStandingsCache;
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
}
