import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  JolpikaCalendarRace,
  JolpikaConstructorStanding,
  JolpikaDriverStanding,
  JolpikaLastRace,
  OpenF1Driver,
  OpenF1Position,
  OpenF1Session,
  OpenF1Weather,
} from './f1-live.types';

interface SourceWrapped<T> {
  source: string;
  items: T[];
}

@Injectable({ providedIn: 'root' })
export class F1LiveService {
  private readonly api = inject(ApiService);

  getDrivers(): Observable<OpenF1Driver[]> {
    return this.api.get<OpenF1Driver[]>('/f1/openf1/drivers');
  }

  getPositions(): Observable<OpenF1Position[]> {
    return this.api.get<OpenF1Position[]>('/f1/openf1/position');
  }

  getWeather(): Observable<OpenF1Weather> {
    return this.api.get<OpenF1Weather>('/f1/openf1/weather');
  }

  getSessions(): Observable<OpenF1Session[]> {
    return this.api.get<OpenF1Session[]>('/f1/openf1/sessions');
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
}
