import { inject, Injectable } from '@angular/core';
import { map, Observable, of, shareReplay } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SERIES_CONFIG } from '../../core/series/series.config';
import { SeriesContextService } from '../../core/series/series-context.service';
import type { SeriesId } from '../../core/series/series.types';
import {
  JolpikaCalendarRace,
  JolpikaConstructorProfile,
  JolpikaConstructorProfileAggregates,
  JolpikaConstructorStanding,
  JolpikaDriverProfile,
  JolpikaDriverProfileAggregates,
  JolpikaDriverStanding,
  JolpikaLastRace,
  JolpikaRaceResult,
  MotogpRoundSessionsPayload,
  OpenF1Driver,
  OpenF1Interval,
  OpenF1Lap,
  OpenF1Location,
  OpenF1Position,
  OpenF1RaceControl,
  OpenF1Session,
  OpenF1Stint,
  OpenF1TeamRadio,
  OpenF1Weather,
} from './f1-live.types';
import type { DataSource } from '../../core/data-source';

export type { DataSource };

interface ItemsWrapped<T> {
  items: T[];
  source?: DataSource;
}

const sessionQuery = (sessionKey?: number | 'latest' | null): string => {
  if (sessionKey === undefined || sessionKey === null) return '';
  return `?session_key=${encodeURIComponent(String(sessionKey))}`;
};

@Injectable({ providedIn: 'root' })
export class F1LiveService {
  private readonly api = inject(ApiService);
  private readonly series = inject(SeriesContextService);

  private constructorStandingsCache = new Map<
    SeriesId,
    Observable<ItemsWrapped<JolpikaConstructorStanding>>
  >();
  private driverStandingsCache = new Map<SeriesId, Observable<ItemsWrapped<JolpikaDriverStanding>>>();

  private seriesId(explicit?: SeriesId): SeriesId {
    return explicit ?? this.series.id();
  }

  private prefix(explicit?: SeriesId): string {
    return `/${this.seriesId(explicit)}`;
  }

  /** F1/F2/F3 → Jolpica; MotoGP/Moto2/Moto3 → Pulse Live. */
  private racingApi(explicit?: SeriesId): string {
    const sid = this.seriesId(explicit);
    return sid === 'motogp' || sid === 'moto2' || sid === 'moto3'
      ? `${this.prefix(sid)}/pulselive`
      : `${this.prefix(sid)}/jolpica`;
  }

  private isPulseSeries(explicit?: SeriesId): boolean {
    const sid = this.seriesId(explicit);
    return sid === 'motogp' || sid === 'moto2' || sid === 'moto3';
  }

  private openF1Enabled(explicit?: SeriesId): boolean {
    return SERIES_CONFIG[this.seriesId(explicit)].features.openF1;
  }

  getSessions(seriesId?: SeriesId): Observable<OpenF1Session[]> {
    const sid = this.seriesId(seriesId);
    if (sid === 'motogp') {
      return this.api
        .get<ItemsWrapped<OpenF1Session>>(`${this.racingApi(sid)}/sessions`)
        .pipe(map((res) => res.items ?? []));
    }
    if (!this.openF1Enabled(seriesId)) return of([]);
    return this.api.get<OpenF1Session[]>(`${this.prefix(seriesId)}/openf1/sessions`);
  }

  getDrivers(sessionKey?: number | 'latest' | null, seriesId?: SeriesId): Observable<OpenF1Driver[]> {
    if (!this.openF1Enabled(seriesId)) return of([]);
    return this.api.get<OpenF1Driver[]>(`${this.prefix(seriesId)}/openf1/drivers${sessionQuery(sessionKey)}`);
  }

  getPositions(sessionKey?: number | 'latest' | null): Observable<OpenF1Position[]> {
    if (!this.openF1Enabled()) return of([]);
    return this.api.get<OpenF1Position[]>(`${this.prefix()}/openf1/position${sessionQuery(sessionKey)}`);
  }

  getWeather(sessionKey?: number | 'latest' | null): Observable<OpenF1Weather> {
    if (!this.openF1Enabled()) return of([] as unknown as OpenF1Weather);
    return this.api.get<OpenF1Weather>(`${this.prefix()}/openf1/weather${sessionQuery(sessionKey)}`);
  }

  getLaps(sessionKey?: number | 'latest' | null): Observable<OpenF1Lap[]> {
    if (!this.openF1Enabled()) return of([]);
    return this.api.get<OpenF1Lap[]>(`${this.prefix()}/openf1/laps${sessionQuery(sessionKey)}`);
  }

  getIntervals(sessionKey?: number | 'latest' | null): Observable<OpenF1Interval[]> {
    if (!this.openF1Enabled()) return of([]);
    return this.api.get<OpenF1Interval[]>(`${this.prefix()}/openf1/intervals${sessionQuery(sessionKey)}`);
  }

  getStints(sessionKey?: number | 'latest' | null): Observable<OpenF1Stint[]> {
    if (!this.openF1Enabled()) return of([]);
    return this.api.get<OpenF1Stint[]>(`${this.prefix()}/openf1/stints${sessionQuery(sessionKey)}`);
  }

  getRaceControl(sessionKey?: number | 'latest' | null): Observable<OpenF1RaceControl[]> {
    if (!this.openF1Enabled()) return of([]);
    return this.api.get<OpenF1RaceControl[]>(`${this.prefix()}/openf1/race-control${sessionQuery(sessionKey)}`);
  }

  getTeamRadio(sessionKey?: number | 'latest' | null): Observable<OpenF1TeamRadio[]> {
    if (!this.openF1Enabled()) return of([]);
    return this.api.get<OpenF1TeamRadio[]>(`${this.prefix()}/openf1/team-radio${sessionQuery(sessionKey)}`);
  }

  getLocation(driverNumber = 1, sessionKey?: number | 'latest' | null): Observable<OpenF1Location[]> {
    if (!this.openF1Enabled()) return of([]);
    const base = `${this.prefix()}/openf1/location?driver=${driverNumber}`;
    if (sessionKey === undefined || sessionKey === null) return this.api.get<OpenF1Location[]>(base);
    return this.api.get<OpenF1Location[]>(`${base}&session_key=${encodeURIComponent(String(sessionKey))}`);
  }

  getDriverStandingsResponse(
    forceRefresh = false,
    seriesId?: SeriesId,
  ): Observable<ItemsWrapped<JolpikaDriverStanding>> {
    const sid = this.seriesId(seriesId);
    if (forceRefresh) this.driverStandingsCache.delete(sid);
    if (!this.driverStandingsCache.has(sid)) {
      const obs = this.api
        .get<ItemsWrapped<JolpikaDriverStanding>>(`${this.racingApi(sid)}/driver-standings`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.driverStandingsCache.set(sid, obs);
    }
    return this.driverStandingsCache.get(sid)!;
  }

  getDriverStandings(forceRefresh = false, seriesId?: SeriesId): Observable<JolpikaDriverStanding[]> {
    return this.getDriverStandingsResponse(forceRefresh, seriesId).pipe(
      map((res) => res.items ?? []),
    );
  }

  getDriverProfile(driverId: string, careerPage = 1): Observable<JolpikaDriverProfile> {
    const id = encodeURIComponent(driverId.trim());
    const p = Math.max(1, careerPage);
    const q = p > 1 ? `?careerPage=${p}` : '';
    return this.api.get<JolpikaDriverProfile>(`${this.racingApi()}/drivers/${id}/profile${q}`);
  }

  getDriverProfileAggregates(driverId: string): Observable<JolpikaDriverProfileAggregates> {
    const id = encodeURIComponent(driverId.trim());
    return this.api.get<JolpikaDriverProfileAggregates>(
      `${this.racingApi()}/drivers/${id}/profile/aggregates`,
    );
  }

  getConstructorStandingsResponse(
    forceRefresh = false,
    seriesId?: SeriesId,
  ): Observable<ItemsWrapped<JolpikaConstructorStanding>> {
    const sid = this.seriesId(seriesId);
    if (forceRefresh) this.constructorStandingsCache.delete(sid);
    if (!this.constructorStandingsCache.has(sid)) {
      const obs = this.api
        .get<ItemsWrapped<JolpikaConstructorStanding>>(`${this.racingApi(sid)}/constructor-standings`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.constructorStandingsCache.set(sid, obs);
    }
    return this.constructorStandingsCache.get(sid)!;
  }

  getConstructorStandings(
    forceRefresh = false,
    seriesId?: SeriesId,
  ): Observable<JolpikaConstructorStanding[]> {
    return this.getConstructorStandingsResponse(forceRefresh, seriesId).pipe(
      map((res) => res.items ?? []),
    );
  }

  getConstructorProfile(constructorId: string, careerPage = 1): Observable<JolpikaConstructorProfile> {
    const id = encodeURIComponent(constructorId.trim());
    const p = Math.max(1, careerPage);
    const q = p > 1 ? `?careerPage=${p}` : '';
    return this.api.get<JolpikaConstructorProfile>(`${this.racingApi()}/constructors/${id}/profile${q}`);
  }

  getConstructorProfileAggregates(
    constructorId: string,
  ): Observable<JolpikaConstructorProfileAggregates> {
    const id = encodeURIComponent(constructorId.trim());
    return this.api.get<JolpikaConstructorProfileAggregates>(
      `${this.racingApi()}/constructors/${id}/profile/aggregates`,
    );
  }

  getCalendar(seriesId?: SeriesId): Observable<JolpikaCalendarRace[]> {
    return this.api
      .get<ItemsWrapped<JolpikaCalendarRace>>(`${this.racingApi(seriesId)}/calendar`)
      .pipe(map((res) => res.items ?? []));
  }

  getLastRace(seriesId?: SeriesId): Observable<JolpikaLastRace> {
    return this.api.get<JolpikaLastRace>(`${this.racingApi(seriesId)}/last-race`);
  }

  getRaceResults(
    round: number,
    seriesId?: SeriesId,
    sessionKey?: string,
  ): Observable<JolpikaRaceResult> {
    const sid = this.seriesId(seriesId);
    const base = `${this.racingApi(sid)}/results/${round}`;
    const q =
      this.isPulseSeries(sid) && sessionKey
        ? `?session=${encodeURIComponent(sessionKey)}`
        : '';
    return this.api.get<JolpikaRaceResult>(`${base}${q}`);
  }

  getRoundSessions(round: number, seriesId?: SeriesId): Observable<MotogpRoundSessionsPayload> {
    return this.api.get<MotogpRoundSessionsPayload>(
      `${this.racingApi(seriesId)}/results/${round}/sessions`,
    );
  }
}
