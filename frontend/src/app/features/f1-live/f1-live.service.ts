import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  JolpikaCalendarRace,
  JolpikaConstructorStanding,
  JolpikaDriverStanding,
  JolpikaLastRace,
  JolpikaRaceResult,
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

interface SourceWrapped<T> {
  source: string;
  items: T[];
}

@Injectable({ providedIn: 'root' })
export class F1LiveService {
  private readonly api = inject(ApiService);

  getSessions(): Observable<OpenF1Session[]> {
    return this.api.get<OpenF1Session[]>('/f1/openf1/sessions');
  }

  getDrivers(): Observable<OpenF1Driver[]> {
    return this.api.get<OpenF1Driver[]>('/f1/openf1/drivers');
  }

  getPositions(): Observable<OpenF1Position[]> {
    return this.api.get<OpenF1Position[]>('/f1/openf1/position');
  }

  getWeather(): Observable<OpenF1Weather> {
    return this.api.get<OpenF1Weather>('/f1/openf1/weather');
  }

  getLaps(): Observable<OpenF1Lap[]> {
    return this.api.get<OpenF1Lap[]>('/f1/openf1/laps');
  }

  getIntervals(): Observable<OpenF1Interval[]> {
    return this.api.get<OpenF1Interval[]>('/f1/openf1/intervals');
  }

  getStints(): Observable<OpenF1Stint[]> {
    return this.api.get<OpenF1Stint[]>('/f1/openf1/stints');
  }

  getRaceControl(): Observable<OpenF1RaceControl[]> {
    return this.api.get<OpenF1RaceControl[]>('/f1/openf1/race-control');
  }

  getTeamRadio(): Observable<OpenF1TeamRadio[]> {
    return this.api.get<OpenF1TeamRadio[]>('/f1/openf1/team-radio');
  }

  getLocation(driverNumber = 1): Observable<OpenF1Location[]> {
    return this.api.get<OpenF1Location[]>(`/f1/openf1/location?driver=${driverNumber}`);
  }

  getDriverStandings(): Observable<JolpikaDriverStanding[]> {
    return this.api
      .get<SourceWrapped<JolpikaDriverStanding>>('/f1/jolpica/driver-standings')
      .pipe(map(res => res.items ?? []));
  }

  getConstructorStandings(): Observable<JolpikaConstructorStanding[]> {
    return this.api
      .get<SourceWrapped<JolpikaConstructorStanding>>('/f1/jolpica/constructor-standings')
      .pipe(map(res => res.items ?? []));
  }

  getCalendar(): Observable<JolpikaCalendarRace[]> {
    return this.api
      .get<SourceWrapped<JolpikaCalendarRace>>('/f1/jolpica/calendar')
      .pipe(map(res => res.items ?? []));
  }

  getLastRace(): Observable<JolpikaLastRace> {
    return this.api.get<JolpikaLastRace>('/f1/jolpica/last-race');
  }

  getRaceResults(round: number): Observable<JolpikaRaceResult> {
    return this.api.get<JolpikaRaceResult>(`/f1/jolpica/results/${round}`);
  }
}
