import { Injectable } from '@angular/core';
import type { NewsItem } from '../../../data/sports.data';
import type { SeriesId } from '../../../core/series/series.types';
import type {
  JolpikaCalendarRace,
  JolpikaConstructorStanding,
  JolpikaDriverStanding,
  JolpikaLastRace,
  OpenF1Session,
} from '../../f1-live/f1-live.types';

export interface HomeSeriesSnapshot {
  calendar: JolpikaCalendarRace[];
  driverStands: JolpikaDriverStanding[];
  teamStands: JolpikaConstructorStanding[];
  lastRace: JolpikaLastRace | null;
  sessions: OpenF1Session[];
  news: NewsItem[];
}

/** Caché en memoria para evitar parpadeo al cambiar entre F1 / F2 / F3. */
@Injectable({ providedIn: 'root' })
export class HomeSeriesCacheService {
  private readonly store = new Map<SeriesId, HomeSeriesSnapshot>();

  get(seriesId: SeriesId): HomeSeriesSnapshot | undefined {
    return this.store.get(seriesId);
  }

  set(seriesId: SeriesId, snapshot: HomeSeriesSnapshot): void {
    this.store.set(seriesId, snapshot);
  }
}
