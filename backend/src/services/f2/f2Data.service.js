import { DB_ENABLED, FIA_F2_ENABLED } from '../../config/env.js';
import { seasonIdFor } from '../../repositories/db/season.repository.js';
import {
  enrichConstructorStandingsWithMedia,
  getConstructorSeasonMediaMap,
} from '../../repositories/db/constructorMedia.js';
import {
  getEventCircuitMediaMap,
  mergeCalendarWithCircuitMedia,
} from '../../repositories/db/eventCircuitMedia.js';
import { resolveWithFallbackOrEmpty } from '../shared/resolveWithFallback.js';
import {
  getCalendarFromDb,
  getConstructorStandingsFromDb,
  getDriverStandingsFromDb,
  getLastRaceFromDb,
  getRaceResultsFromDb,
  findDriverSeasonEntry,
  getDriverEntriesForConstructor,
} from '../../repositories/db/feeder.repository.js';
import { getF2FiaApi } from './f2FiaApi.js';
import { toPublicMediaUrl } from '../../lib/supabaseStorage.js';

const SERIES = 'f2';

const stripInternal = (items) =>
  items.map(({ fiaRaceId, sprintDate, ...race }) => race);

const withSource = (resolved, body) => ({
  ...body,
  source: resolved.source,
});

const mapRaceResultsResponse = (race) => ({
  round: race.round,
  raceName: race.raceName,
  circuitName: race.circuitName,
  date: race.date,
  results: race.results,
  live: race.live === true,
  sessionPending: race.sessionPending === true,
});

const mapRacePayload = (race) => ({
  round: race.round,
  raceName: race.raceName,
  circuitName: race.circuitName,
  date: race.date,
  imageUrl: null,
  results: race.results.map((r) => ({
    position: r.position,
    driver: r.driver,
    driverId: r.driverId,
    team: r.team,
    constructorId: r.constructorId,
    grid: r.grid,
    laps: r.laps,
    status: r.status,
    points: r.points,
    time: r.time,
  })),
});

export const getMaxCompletedRound = async () => {
  const cal = await getCalendar();
  const rounds = cal.items.filter((r) => r.resultsAvailable).map((r) => r.round);
  return rounds.length ? Math.max(...rounds) : 0;
};

export const getDriverStandings = async (opts = {}) => {
  const resolved = await resolveWithFallbackOrEmpty(
    async () => (await getF2FiaApi()).getDriverStandings().then((r) => r.items),
    () => getDriverStandingsFromDb(SERIES),
    [],
    { liveEnabled: FIA_F2_ENABLED, preferDb: opts.preferDb !== false },
  );
  return withSource(resolved, { items: resolved.data });
};

export const getConstructorStandings = async (opts = {}) => {
  const resolved = await resolveWithFallbackOrEmpty(
    async () => (await getF2FiaApi()).getConstructorStandings().then((r) => r.items),
    () => getConstructorStandingsFromDb(SERIES),
    [],
    { liveEnabled: FIA_F2_ENABLED, preferDb: opts.preferDb !== false },
  );
  let items = resolved.data;
  if (DB_ENABLED && items.length) {
    try {
      const media = await getConstructorSeasonMediaMap(seasonIdFor(SERIES));
      items = enrichConstructorStandingsWithMedia(items, media);
    } catch {
      /* medios opcionales */
    }
  }
  return withSource(resolved, { items });
};

export const getCalendar = async (opts = {}) => {
  const resolved = await resolveWithFallbackOrEmpty(
    async () =>
      (await getF2FiaApi()).getCalendar().then((r) => stripInternal(r.items)),
    () => getCalendarFromDb(SERIES),
    [],
    { liveEnabled: FIA_F2_ENABLED, preferDb: opts.preferDb !== false },
  );
  let items = resolved.data;
  if (DB_ENABLED && items.length) {
    try {
      const media = await getEventCircuitMediaMap(seasonIdFor(SERIES));
      items = mergeCalendarWithCircuitMedia(items, media);
    } catch {
      /* circuitos opcionales */
    }
  }
  return withSource(resolved, { items });
};

export const getLastRace = async (opts = {}) => {
  const resolved = await resolveWithFallbackOrEmpty(
    async () => (await getF2FiaApi()).getLastRace().then(mapRacePayload),
    () => getLastRaceFromDb(SERIES).then((r) => (r ? mapRacePayload(r) : null)),
    null,
    { liveEnabled: FIA_F2_ENABLED, preferDb: opts.preferDb !== false },
  );
  if (!resolved.data) throw new Error('No last F2 race data');
  return withSource(resolved, resolved.data);
};

export const getRaceResultsByRound = async (round, opts = {}) => {
  const cleanRound = Number.parseInt(round, 10);
  const resolved = await resolveWithFallbackOrEmpty(
    async () =>
      (await getF2FiaApi())
        .getRaceResultsByRound(cleanRound, { allowLive: true })
        .then(mapRaceResultsResponse),
    () => getRaceResultsFromDb(SERIES, cleanRound).then(mapRaceResultsResponse),
    null,
    { liveEnabled: FIA_F2_ENABLED, preferDb: opts.preferDb !== false },
  );
  if (!resolved.data) throw new Error(`No F2 race results for round ${cleanRound}`);
  return withSource(resolved, resolved.data);
};

export const findDriverGrid = async (driverId) => {
  const entry = await findDriverSeasonEntry(SERIES, driverId);
  if (!entry) return null;
  const { namesFromDriverEntry } = await import('../shared/feederProfile.shared.js');
  const { givenName, familyName } = namesFromDriverEntry(entry);
  return {
    driverId: entry.driverId,
    givenName,
    familyName,
    driver: entry.displayName,
    team: entry.teamName,
    nationality: entry.driver?.nationality ?? '',
    gridOrder: entry.gridOrder ?? 99,
    headshotUrl: toPublicMediaUrl(entry.headshotUrl ?? entry.driver?.headshotUrl),
  };
};

export const findConstructorGrid = async (constructorId) => {
  const prisma = (await import('../../lib/prisma.js')).requirePrisma();
  const { seasonIdFor } = await import('../../repositories/db/season.repository.js');
  const { getF2ConstructorGridEntry } = await import('../../data/f2/f2ConstructorsGrid2026.js');
  const cs = await prisma.constructorSeason.findUnique({
    where: {
      seasonId_constructorId: {
        seasonId: seasonIdFor(SERIES),
        constructorId,
      },
    },
  });
  if (!cs) return null;
  const curated = getF2ConstructorGridEntry(constructorId);
  return {
    constructorId,
    team: cs.name,
    nationality: curated?.nationality ?? '',
    teamColor: cs.teamColor ?? null,
    logoUrl: toPublicMediaUrl(cs.logoUrl),
    bikeImageUrl: toPublicMediaUrl(cs.bikeImageUrl),
  };
};

export const getDriversForConstructor = async (constructorId) => {
  const entries = await getDriverEntriesForConstructor(SERIES, constructorId);
  const { mapConstructorProfileDriver } = await import('../shared/feederProfile.shared.js');
  return entries.map((e) => mapConstructorProfileDriver(e));
};
