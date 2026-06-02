import { DB_ENABLED, JOLPICA_F1_ENABLED } from '../../config/env.js';
import { seasonIdFor } from '../../repositories/db/season.repository.js';
import {
  enrichConstructorStandingsWithMedia,
  getConstructorSeasonMediaMap,
} from '../../repositories/db/constructorMedia.js';
import {
  getEventCircuitMediaMap,
  mergeCalendarWithCircuitMedia,
} from '../../repositories/db/eventCircuitMedia.js';
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

export const getDriverStandings = async (opts = {}) => {
  const resolved = await resolveWithFallbackOrEmpty(
    () => fetchLiveDriverStandings(),
    () => getDriverStandingsFromDb(),
    [],
    { liveEnabled: JOLPICA_F1_ENABLED, preferDb: opts.preferDb !== false },
  );
  return withSource(resolved, { items: resolved.data });
};

export const getConstructorStandings = async (opts = {}) => {
  const resolved = await resolveWithFallbackOrEmpty(
    () => fetchLiveConstructorStandings(),
    () => getConstructorStandingsFromDb(),
    [],
    { liveEnabled: JOLPICA_F1_ENABLED, preferDb: opts.preferDb !== false },
  );
  let items = resolved.data;
  if (DB_ENABLED && items.length) {
    try {
      const media = await getConstructorSeasonMediaMap(seasonIdFor('f1'));
      items = enrichConstructorStandingsWithMedia(items, media);
    } catch {
      /* medios opcionales */
    }
  }
  return withSource(resolved, { items });
};

export const getCalendar = async (opts = {}) => {
  const resolved = await resolveWithFallbackOrEmpty(
    () => fetchLiveCalendar(),
    () => getCalendarFromDb(),
    [],
    { liveEnabled: JOLPICA_F1_ENABLED, preferDb: opts.preferDb !== false },
  );
  let items = resolved.data;
  if (DB_ENABLED && items.length) {
    try {
      const media = await getEventCircuitMediaMap(seasonIdFor('f1'));
      items = mergeCalendarWithCircuitMedia(items, media);
    } catch {
      /* circuitos opcionales */
    }
  }
  return withSource(resolved, { items });
};

export const getLastRace = async (opts = {}) => {
  const resolved = await resolveWithFallbackOrEmpty(
    async () => {
      const data = await fetchLiveLastRace();
      let imageUrl = null;
      try {
        imageUrl = await resolveLastRaceImageUrl(data);
      } catch {
        /* opcional */
      }
      return { ...data, imageUrl };
    },
    () => getLastRaceFromDb(),
    null,
    { liveEnabled: JOLPICA_F1_ENABLED, preferDb: opts.preferDb !== false },
  );
  if (!resolved.data) throw new Error('No last F1 race data');
  return { ...resolved.data, source: resolved.source };
};

export const getRaceResultsByRound = async (round, opts = {}) => {
  const cleanRound = Number.parseInt(round, 10);
  if (!Number.isInteger(cleanRound) || cleanRound < 1) {
    throw new Error('Invalid race round');
  }

  const resolved = await resolveWithFallbackOrEmpty(
    () => fetchLiveRaceResultsByRound(cleanRound),
    () => getRaceResultsFromDb(cleanRound),
    null,
    { liveEnabled: JOLPICA_F1_ENABLED, preferDb: opts.preferDb !== false },
  );
  if (!resolved.data) {
    throw new Error(`No race results available for round ${cleanRound}`);
  }
  return { ...resolved.data, source: resolved.source };
};
