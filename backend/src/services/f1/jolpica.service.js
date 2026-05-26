import { JOLPICA_F1_ENABLED } from '../../config/env.js';
import { resolveWithFallback, resolveWithFallbackOrEmpty } from '../shared/resolveWithFallback.js';
import {
  getCalendarFromDb,
  getConstructorStandingsFromDb,
  getDriverStandingsFromDb,
  getLastRaceFromDb,
  getRaceResultsFromDb,
} from '../../repositories/db/f1.repository.js';
import {
  fetchLiveCalendar,
  fetchLiveConstructorStandings,
  fetchLiveDriverStandings,
  fetchLiveLastRace,
  fetchLiveRaceResultsByRound,
} from './jolpica.live.js';
import { resolveLastRaceImageUrl } from '../shared/lastRaceImage.service.js';
import { warmConstructorStandingsCache } from './constructorStandingsStore.js';
import { warmDriverStandingsCache } from './driverStandingsStore.js';

export { warmConstructorStandingsCache, warmDriverStandingsCache };

const withSource = (resolved, body) => ({
  ...body,
  source: resolved.source,
});

export const getDriverStandings = async () => {
  const resolved = await resolveWithFallbackOrEmpty(
    () => fetchLiveDriverStandings(),
    () => getDriverStandingsFromDb(),
    [],
    { liveEnabled: JOLPICA_F1_ENABLED },
  );
  return withSource(resolved, { items: resolved.data });
};

export const getConstructorStandings = async () => {
  const resolved = await resolveWithFallbackOrEmpty(
    () => fetchLiveConstructorStandings(),
    () => getConstructorStandingsFromDb(),
    [],
    { liveEnabled: JOLPICA_F1_ENABLED },
  );
  return withSource(resolved, { items: resolved.data });
};

export const getCalendar = async () => {
  const resolved = await resolveWithFallbackOrEmpty(
    () => fetchLiveCalendar(),
    () => getCalendarFromDb(),
    [],
    { liveEnabled: JOLPICA_F1_ENABLED },
  );
  return withSource(resolved, { items: resolved.data });
};

export const getLastRace = async () => {
  if (!JOLPICA_F1_ENABLED) {
    const db = await getLastRaceFromDb();
    if (db) return { ...db, source: 'db' };
    throw new Error('No last F1 race data');
  }

  try {
    const data = await fetchLiveLastRace();
    let imageUrl = null;
    try {
      imageUrl = await resolveLastRaceImageUrl(data);
    } catch {
      /* opcional */
    }
    return { ...data, imageUrl, source: 'live' };
  } catch {
    const db = await getLastRaceFromDb();
    if (!db) throw new Error('No last F1 race data');
    return { ...db, source: 'db' };
  }
};

export const getRaceResultsByRound = async (round) => {
  const cleanRound = Number.parseInt(round, 10);
  if (!Number.isInteger(cleanRound) || cleanRound < 1) {
    throw new Error('Invalid race round');
  }

  const resolved = await resolveWithFallback(
    () => fetchLiveRaceResultsByRound(cleanRound),
    () => getRaceResultsFromDb(cleanRound),
    { liveEnabled: JOLPICA_F1_ENABLED },
  );
  return { ...resolved.data, source: resolved.source };
};
