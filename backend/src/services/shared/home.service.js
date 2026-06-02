import { getNewsSummaryForHome } from './newsFeed.service.js';
import {
  getCalendarFromDb,
  getDriverStandingsFromDb,
  getConstructorStandingsFromDb,
  getLastRaceFromDb,
} from '../../repositories/db/feeder.repository.js';
import { getConstructorStandingsFromDb as getF1ConstructorsFromDb } from '../../repositories/db/f1.repository.js';
import { seasonIdFor } from '../../repositories/db/season.repository.js';
import { getEventCircuitMediaMap, mergeCalendarWithCircuitMedia } from '../../repositories/db/eventCircuitMedia.js';
import {
  enrichConstructorStandingsWithMedia,
  getConstructorSeasonMediaMap,
} from '../../repositories/db/constructorMedia.js';

/** @param {Array<'live'|'db'|'empty'|undefined|null>} parts */
const pickSource = (...parts) => {
  const sources = parts.filter(Boolean);
  if (sources.includes('db')) return 'db';
  if (sources.length && sources.every((s) => s === 'empty')) return 'empty';
  if (sources.includes('live')) return 'live';
  return 'empty';
};

const shortDriver = (name) => {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
};

const mapStandings = (items, limit = 8) =>
  (items ?? []).slice(0, limit).map((d) => ({
    pos: d.pos,
    driver: shortDriver(d.driver),
    team: d.team,
    points: d.points,
    nationality: (d.nationality ?? '').slice(0, 2).toUpperCase(),
    teamColor: d.teamColor ?? null,
    driverId: d.driverId,
  }));

const mapConstructors = (items, limit = 5) =>
  (items ?? []).slice(0, limit).map((c) => ({
    pos: c.pos,
    team: c.team,
    points: c.points,
    color: c.teamColor ?? null,
  }));

const mapLastRace = (race) => {
  if (!race?.results?.length) {
    return { name: '—', date: '', podium: [] };
  }
  return {
    name: race.raceName ?? '—',
    date: race.date ?? '',
    podium: race.results.slice(0, 3).map((r) => ({
      pos: r.position,
      driver: shortDriver(r.driver),
      time: r.time ?? '—',
      team: r.team,
      teamColor: r.teamColor ?? null,
    })),
  };
};

async function enrichF1Calendar(items) {
  try {
    const media = await getEventCircuitMediaMap(seasonIdFor('f1'));
    return mergeCalendarWithCircuitMedia(items, media);
  } catch {
    return items;
  }
}

async function enrichF1Constructors(items) {
  try {
    const media = await getConstructorSeasonMediaMap(seasonIdFor('f1'));
    return enrichConstructorStandingsWithMedia(items, media);
  } catch {
    return items;
  }
}

async function buildF1Home() {
  const [standings, constructors, calendar, lastRace, news] = await Promise.all([
    getDriverStandingsFromDb('f1'),
    getF1ConstructorsFromDb(),
    getCalendarFromDb('f1'),
    getLastRaceFromDb('f1'),
    getNewsSummaryForHome('f1', 4).catch(() => []),
  ]);

  const items = await enrichF1Calendar(calendar ?? []);
  const next =
    items.find((r) => !r.resultsAvailable) ?? items[items.length - 1] ?? null;
  const ctorItems = await enrichF1Constructors(constructors ?? []);

  return {
    nextRace: {
      name: next?.raceName ?? '—',
      circuit: next?.circuitName ?? '—',
      location: [next?.locality, next?.country].filter(Boolean).join(', ') || '—',
      date: next?.date && next?.time ? `${next.date}T${next.time}` : next?.date ?? '',
      round: next?.round ?? 0,
      totalRounds: items.length,
      circuitSvgUrl: next?.circuitSvgUrl ?? null,
      circuitImageUrl: next?.circuitImageUrl ?? null,
      sessions: [],
    },
    standings: mapStandings(standings),
    constructors: mapConstructors(ctorItems),
    lastRace: mapLastRace(lastRace),
    news,
    source: pickSource(
      standings?.length ? 'db' : 'empty',
      items.length ? 'db' : 'empty',
    ),
  };
}

async function buildMotogpHome() {
  const categoryId = 'motogp';
  const [standings, constructors, calendar, lastRace, news] = await Promise.all([
    getDriverStandingsFromDb(categoryId),
    getConstructorStandingsFromDb(categoryId),
    getCalendarFromDb(categoryId),
    getLastRaceFromDb(categoryId),
    getNewsSummaryForHome(categoryId, 4).catch(() => []),
  ]);

  const items = calendar ?? [];
  const next =
    items.find((r) => !r.resultsAvailable) ?? items[items.length - 1] ?? null;

  return {
    nextRace: {
      name: next?.raceName ?? '—',
      circuit: next?.circuitName ?? '—',
      location: [next?.locality, next?.country].filter(Boolean).join(', ') || '—',
      date: next?.date && next?.time ? `${next.date}T${next.time}` : next?.date ?? '',
      round: next?.round ?? 0,
      totalRounds: items.length,
      circuitSvgUrl: next?.circuitSvgUrl ?? null,
      circuitImageUrl: next?.circuitImageUrl ?? null,
      sessions: [],
    },
    standings: mapStandings(standings),
    constructors: mapConstructors(constructors),
    lastRace: mapLastRace(lastRace),
    news,
    source: pickSource(standings?.length ? 'db' : 'empty'),
  };
}

export const getHomeByCategory = async (category) => {
  if (category === 'f1') return buildF1Home();
  if (category === 'motogp') return buildMotogpHome();
  return null;
};
