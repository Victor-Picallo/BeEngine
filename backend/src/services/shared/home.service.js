import {
  getCalendar as getF1Calendar,
  getConstructorStandings as getF1Constructors,
  getDriverStandings as getF1Standings,
  getLastRace as getF1LastRace,
} from '../f1/jolpica.service.js';
import {
  getCalendar as getMotoCalendar,
  getConstructorStandings as getMotoConstructors,
  getDriverStandings as getMotoStandings,
  getLastRace as getMotoLastRace,
  getNextRaceSessions,
} from '../motogp/pulseLive.service.js';
import { getNewsSummaryForHome } from './newsFeed.service.js';

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
  items.slice(0, limit).map((d) => ({
    pos: d.pos,
    driver: shortDriver(d.driver),
    team: d.team,
    points: d.points,
    nationality: (d.nationality ?? '').slice(0, 2).toUpperCase(),
    teamColor: d.teamColor ?? null,
  }));

const mapConstructors = (items, limit = 5) =>
  items.slice(0, limit).map((c) => ({
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

async function buildF1Home() {
  const [standings, constructors, calendar, news] = await Promise.all([
    getF1Standings(),
    getF1Constructors(),
    getF1Calendar(),
    getNewsSummaryForHome('f1', 4).catch(() => []),
  ]);

  const lastRace = await getF1LastRace().catch(() => null);
  const items = calendar.items ?? [];
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
      sessions: [],
    },
    standings: mapStandings(standings.items ?? []),
    constructors: mapConstructors(constructors.items ?? []),
    lastRace: mapLastRace(lastRace),
    news,
    source: pickSource(standings.source, constructors.source, calendar.source, lastRace?.source),
  };
}

async function buildMotogpHome() {
  const [standings, constructors, calendar, sessions, news] = await Promise.all([
    getMotoStandings('motogp'),
    getMotoConstructors('motogp'),
    getMotoCalendar('motogp'),
    getNextRaceSessions('motogp').catch(() => ({ event: null, sessions: [] })),
    getNewsSummaryForHome('motogp', 4).catch(() => []),
  ]);

  const lastRace = await getMotoLastRace('motogp').catch(() => null);
  const ev = sessions.event;
  const items = calendar.items ?? [];
  const next =
    items.find((r) => !r.resultsAvailable) ?? items[items.length - 1] ?? null;

  return {
    nextRace: {
      name: ev?.raceName ?? next?.raceName ?? '—',
      circuit: ev?.circuitName ?? next?.circuitName ?? '—',
      location: [ev?.locality ?? next?.locality, ev?.country ?? next?.country]
        .filter(Boolean)
        .join(', ') || '—',
      date: ev?.date ?? (next?.date && next?.time ? `${next.date}T${next.time}` : next?.date ?? ''),
      round: ev?.round ?? next?.round ?? 0,
      totalRounds: ev?.totalRounds ?? items.length,
      sessions: (sessions.sessions ?? []).map((s) => ({
        name: s.name,
        date: s.date,
        time: s.time,
        highlight: s.highlight,
      })),
    },
    standings: mapStandings(standings.items ?? []),
    constructors: mapConstructors(constructors.items ?? []),
    lastRace: mapLastRace(lastRace),
    news,
    source: pickSource(standings.source, constructors.source, calendar.source, lastRace?.source),
  };
}

export const getHomeByCategory = async (category) => {
  if (category === 'f1') return buildF1Home();
  if (category === 'motogp') return buildMotogpHome();
  return null;
};
