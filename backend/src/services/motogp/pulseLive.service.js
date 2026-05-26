import {
  pulseliveClient,
  MOTOGP_CATEGORY_UUID,
  MOTO2_CATEGORY_UUID,
  MOTO3_CATEGORY_UUID,
} from '../../external/motogp/pulselive.client.js';
import { PULSE_LIVE_ENABLED } from '../../config/env.js';
import { getRidersIndex } from './motogpRiders.service.js';
import { resolveWithFallback, resolveWithFallbackOrEmpty } from '../shared/resolveWithFallback.js';
import {
  getCalendarFromDb,
  getConstructorStandingsFromDb,
  getDriverStandingsFromDb,
  getLastRaceFromDb,
  getOfficialTeamsGridFromDb,
  getRaceResultsFromDb,
  getRoundSessionsFromDb,
} from '../../repositories/db/moto.repository.js';
import {
  fetchCalendar,
  fetchDriverStandings,
  fetchLastRace,
  fetchOfficialTeamsGrid,
  fetchRaceResultsByRound,
  fetchRoundSessionsMeta,
  getCurrentSeason,
  getRaceEvents,
  resolveCircuitDisplayName,
} from './pulseLive.fetch.js';
import { getCircuits, findCircuitByName } from './motogpCircuits.service.js';
import { getTeamsIndex, enrichStandingRow } from './motogpTeams.service.js';
import {
  resolveMotogpTeamLogoUrl,
  resolveOfficialConstructorSlug,
} from '../../data/motogp/motogpTeamLogos.js';
import { resolveMoto2TeamLogoUrl } from '../../data/moto2/moto2TeamLogos.js';
import { resolveMoto3TeamLogoUrl } from '../../data/moto3/moto3TeamLogos.js';
import {
  enrichMoto2DriverStandings,
  enrichMoto2TeamStandings,
} from '../moto2/moto2Data.service.js';
import {
  enrichMoto3DriverStandings,
  enrichMoto3TeamStandings,
} from '../moto3/moto3Data.service.js';
import {
  pickMainRaceSession,
  pulseSessionLabel,
  pulseSessionToKey,
  resolvePulseSession,
  sessionHasResults,
  sessionIsLive,
  sessionHasDisplayableData,
} from './motogpSessions.util.js';

const CATEGORY_UUIDS = {
  motogp: MOTOGP_CATEGORY_UUID,
  moto2:  MOTO2_CATEGORY_UUID,
  moto3:  MOTO3_CATEGORY_UUID,
};

export const categoryUuidFor = (id) => CATEGORY_UUIDS[id] ?? MOTOGP_CATEGORY_UUID;

const motoFeederApi = (categoryId) => {
  if (categoryId === 'moto2') {
    return {
      enrichDrivers: enrichMoto2DriverStandings,
      enrichTeams: enrichMoto2TeamStandings,
      resolveTeamLogo: resolveMoto2TeamLogoUrl,
    };
  }
  if (categoryId === 'moto3') {
    return {
      enrichDrivers: enrichMoto3DriverStandings,
      enrichTeams: enrichMoto3TeamStandings,
      resolveTeamLogo: resolveMoto3TeamLogoUrl,
    };
  }
  return null;
};

const mergeDbCalendarFlags = async (items, categoryId) => {
  const db = await getCalendarFromDb(categoryId);
  if (!db?.length) return items;
  const flags = new Map(db.map((r) => [r.round, r.resultsAvailable]));
  return items.map((row) => ({
    ...row,
    resultsAvailable:
      row.resultsAvailable ||
      (flags.has(row.round) ? Boolean(flags.get(row.round)) : false),
  }));
};

const pulseOpts = { liveEnabled: PULSE_LIVE_ENABLED };

export const getCurrentSeasonYear = async () => {
  const season = await getCurrentSeason();
  return season.year ?? new Date().getFullYear();
};

const asList = (raw) => (Array.isArray(raw) ? raw : raw?.value ?? []);

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const normLabel = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const isTestEventLabel = (name) => /\btest\b/i.test(String(name ?? '').trim());

const isTestEvent = (e) =>
  Boolean(e?.test) || isTestEventLabel(e?.sponsored_name) || isTestEventLabel(e?.name);

const lastNameInitial = (full) => {
  const parts = String(full || '').trim().split(/\s+/);
  if (parts.length < 2) return full;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
};

const formatRaceDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

const formatSessionDate = (iso) =>
  new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
    .format(new Date(iso))
    .replace('.', '');

const formatSessionTime = (iso) =>
  new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const normalizeDriverStandings = (raw) => {
  const rows = raw?.classification ?? [];
  return rows.map((r) => ({
    pos: r.position,
    driver: r.rider?.full_name ?? '—',
    driverId: r.rider?.riders_api_uuid ?? r.rider?.id ?? slugify(r.rider?.full_name),
    team: r.team?.name ?? r.constructor?.name ?? '—',
    constructorId: slugify(r.team?.name ?? r.constructor?.name ?? ''),
    points: Number(r.points) || 0,
    wins: Number(r.race_wins) || 0,
    nationality: r.rider?.country?.iso ?? '',
    teamColor: null,
    headshotUrl: null,
  }));
};

/** Clasificación por equipo (sponsored team), no solo por fabricante. */
const normalizeConstructorStandingsByTeam = (classificationRows, categoryId = 'motogp') => {
  const byTeam = new Map();
  for (const r of classificationRows) {
    const teamName = r.team?.name ?? r.constructor?.name;
    if (!teamName) continue;
    const pts = Number(r.points) || 0;
    const wins = Number(r.race_wins) || 0;
    const cur = byTeam.get(teamName) ?? { team: teamName, points: 0, wins: 0 };
    cur.points += pts;
    cur.wins += wins;
    byTeam.set(teamName, cur);
  }
  return [...byTeam.values()]
    .sort((a, b) => b.points - a.points || a.team.localeCompare(b.team))
    .map((c, i) => {
      const constructorId = slugify(c.team);
      return {
        pos: i + 1,
        team: c.team,
        constructorId,
        points: c.points,
        wins: c.wins,
        nationality: '',
        teamColor: null,
        logoUrl:
          categoryId === 'motogp'
            ? resolveMotogpTeamLogoUrl(null, constructorId, c.team)
            : motoFeederApi(categoryId)?.resolveTeamLogo(null, constructorId, c.team) ?? null,
      };
    });
};

const teamSlugMatches = (a, b) => {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
};

const mergeTeamsGridIntoStandings = (items, teamsIdx) => {
  const rows = [...items];
  for (const t of teamsIdx.list) {
    const key = slugify(t.name);
    const existing = rows.find((row) => teamSlugMatches(slugify(row.team), key));
    if (existing) {
      if (!existing.teamId && t.teamId) existing.teamId = t.teamId;
      if (!existing.bikeImageUrl && t.bikeImageUrl) existing.bikeImageUrl = t.bikeImageUrl;
      if (!existing.logoUrl && t.logoUrl) existing.logoUrl = t.logoUrl;
      if (!existing.teamColor && t.color) existing.teamColor = t.color;
      continue;
    }
    rows.push({
      pos: 0,
      team: t.name,
      constructorId: slugify(t.name),
      teamId: t.teamId,
      points: 0,
      wins: 0,
      nationality: '',
      teamColor: t.color,
      logoUrl: t.logoUrl,
      bikeImageUrl: t.bikeImageUrl,
    });
  }
  return rows
    .sort((a, b) => b.points - a.points || a.team.localeCompare(b.team))
    .map((row, i) => ({ ...row, pos: i + 1 }));
};

const normalizeCalendar = (events) =>
  events.map((e, i) => ({
    round: i + 1,
    raceName: e.sponsored_name?.trim() || e.name,
    circuitName: resolveCircuitDisplayName(e.circuit?.name ?? '—', e),
    circuitId: e.circuit?.id ?? null,
    locality: e.circuit?.place ?? e.circuit?.city ?? '',
    country: e.country?.name ?? e.circuit?.nation ?? e.circuit?.country ?? '',
    date: e.date_start?.slice(0, 10) ?? '',
    time: e.date_start?.includes('T') ? e.date_start.split('T')[1]?.slice(0, 8) : null,
    status: e.status,
    eventId: e.id,
  }));

const enrichRaceResultsHeadshots = async (rows, seasonYear, categoryId = 'motogp') => {
  try {
    const year =
      Number.parseInt(String(seasonYear ?? new Date().getFullYear()), 10) ||
      new Date().getFullYear();
    const [ridersIdx, teamsIdx] = await Promise.all([
      getRidersIndex(),
      getTeamsIndex(year, categoryId),
    ]);
    return rows.map((r) => {
      const rider =
        ridersIdx.byId.get(r.driverId) ??
        ridersIdx.bySlug.get(slugify(r.driver));
      const withTeam = enrichStandingRow(
        {
          team: r.team,
          constructorId: r.constructorId ?? slugify(r.team),
          teamColor: null,
        },
        teamsIdx,
        categoryId,
      );
      return {
        ...r,
        headshotUrl:
          rider?.portraitUrl ??
          motoFeederApi(categoryId)?.portraits[r.driverId] ??
          null,
        teamColor: withTeam.teamColor ?? null,
      };
    });
  } catch {
    const feeder = motoFeederApi(categoryId);
    if (feeder) {
      return rows.map((r) => ({
        ...r,
        headshotUrl: feeder.portraits[r.driverId] ?? r.headshotUrl ?? null,
      }));
    }
    return rows;
  }
};

const formatClassificationTime = (r, sessionType) => {
  if (sessionType === 'RAC') {
    const gapFirst = r.gap?.first;
    if (r.position === 1) return r.time ?? '—';
    if (gapFirst && gapFirst !== '0.000' && gapFirst !== '0') {
      return gapFirst.includes(':') || gapFirst.includes('+') ? gapFirst : `+${gapFirst}s`;
    }
    return r.time ?? r.status ?? '—';
  }
  if (r.best_lap?.time) {
    const gapFirst = r.gap?.first;
    if (r.position === 1) return r.best_lap.time;
    if (gapFirst && gapFirst !== '0.000' && gapFirst !== '0') {
      return `+${gapFirst}s`;
    }
    return r.best_lap.time;
  }
  return r.time ?? '—';
};

const normalizeClassification = (cls, session) => {
  const sessionType = session?.type ?? 'RAC';
  return (cls?.classification ?? []).map((r) => ({
    position: r.position,
    driver: r.rider?.full_name ?? '—',
    driverId: r.rider?.riders_api_uuid ?? r.rider?.id ?? slugify(r.rider?.full_name),
    team: r.team?.name ?? r.constructor?.name ?? '—',
    constructorId: slugify(r.constructor?.name ?? r.team?.name),
    points: sessionType === 'RAC' ? Number(r.points) || 0 : 0,
    time: formatClassificationTime(r, sessionType),
    grid: Number(r.start_position ?? r.grid ?? r.position) || null,
    laps: Number(r.total_laps) || 0,
    status: r.status ?? 'Finished',
    number: r.rider?.number ?? null,
  }));
};

const fetchEventSessions = async (event, categoryId = 'motogp') => {
  if (!event?.id) return [];
  return asList(
    await pulseliveClient.get(
      `/results/sessions?eventUuid=${event.id}&categoryUuid=${categoryUuidFor(categoryId)}`,
    ),
  );
};

// ── Public API ───────────────────────────────────────────────

export const getDriverStandings = async (categoryId = 'motogp') => {
  const resolved = await resolveWithFallbackOrEmpty(
    () => fetchDriverStandings(categoryId),
    () => getDriverStandingsFromDb(categoryId),
    [],
    pulseOpts,
  );
  return { items: resolved.data, source: resolved.source };
};

const enrichDriversWithTeamsAndPortraits = async (items, seasonYear, categoryId = 'motogp') => {
  try {
    const [ridersIdx, teamsIdx] = await Promise.all([
      getRidersIndex(),
      getTeamsIndex(seasonYear, categoryId),
    ]);
    return items.map((row) => {
      const rider =
        ridersIdx.byId.get(row.driverId) ??
        ridersIdx.bySlug.get(row.driverId) ??
        ridersIdx.bySlug.get(slugify(row.driver));
      const withTeam = enrichStandingRow(row, teamsIdx, categoryId);
      return {
        ...withTeam,
        headshotUrl: rider?.portraitUrl ?? withTeam.headshotUrl ?? null,
        teamColor:
          withTeam.teamColor ?? teamsIdx.bySlug.get(slugify(row.team))?.color ?? null,
      };
    });
  } catch {
    return items;
  }
};

export const getConstructorStandings = async (categoryId = 'motogp') => {
  const resolved = await resolveWithFallbackOrEmpty(
    async () => {
      const season = await getCurrentSeason();
      const [raw, teamsIdx] = await Promise.all([
        pulseliveClient.get(
          `/results/standings?seasonUuid=${season.id}&categoryUuid=${categoryUuidFor(categoryId)}`,
        ),
        getTeamsIndex(season.year, categoryId),
      ]);
      let items = normalizeConstructorStandingsByTeam(raw?.classification ?? [], categoryId);
      items = mergeTeamsGridIntoStandings(items, teamsIdx);
      items = items.map((row) => enrichStandingRow(row, teamsIdx, categoryId));
      const feeder = motoFeederApi(categoryId);
      if (feeder) items = feeder.enrichTeams(items);
      return items;
    },
    () => getConstructorStandingsFromDb(categoryId),
    [],
    pulseOpts,
  );
  return { items: resolved.data, source: resolved.source };
};

/** Parrilla oficial: 11 equipos Pulse + puntos/victorias agregados por equipo del grid. */
const aggregateStandingsByOfficialTeam = (classificationRows, categoryId = 'motogp') => {
  const bySlug = new Map();
  for (const r of classificationRows) {
    const teamName = r.team?.name ?? r.constructor?.name;
    if (!teamName) continue;
    const officialSlug =
      categoryId === 'motogp'
        ? resolveOfficialConstructorSlug(
            r.team?.id ?? r.team?.uuid ?? null,
            slugify(teamName),
            teamName,
          )
        : slugify(teamName);
    if (categoryId === 'motogp' && !officialSlug) continue;
    if (!officialSlug) continue;
    const pts = Number(r.points) || 0;
    const wins = Number(r.race_wins) || 0;
    const cur = bySlug.get(officialSlug) ?? { points: 0, wins: 0 };
    cur.points += pts;
    cur.wins += wins;
    bySlug.set(officialSlug, cur);
  }
  return bySlug;
};

export const getOfficialTeamsGrid = async (categoryId = 'motogp') => {
  const resolved = await resolveWithFallbackOrEmpty(
    () => fetchOfficialTeamsGrid(categoryId),
    () => getOfficialTeamsGridFromDb(categoryId),
    [],
    pulseOpts,
  );
  return { items: resolved.data, source: resolved.source };
};

export const getCalendar = async (categoryId = 'motogp') => {
  const resolved = await resolveWithFallbackOrEmpty(
    async () => mergeDbCalendarFlags(await fetchCalendar(categoryId), categoryId),
    () => getCalendarFromDb(categoryId),
    [],
    pulseOpts,
  );
  return { items: resolved.data, source: resolved.source };
};

export const getLastRace = async (categoryId = 'motogp') => {
  const resolved = await resolveWithFallbackOrEmpty(
    async () => {
      const race = await fetchLastRace(categoryId);
      const season = await getCurrentSeason();
      const circuit = await findCircuitByName(
        race.circuitName,
        season.year,
      ).catch(() => null);
      return {
        ...race,
        imageUrl: circuit?.imageUrl ?? circuit?.svgUrl ?? null,
      };
    },
    () => getLastRaceFromDb(categoryId),
    null,
    pulseOpts,
  );
  if (!resolved.data) throw new Error('No last race data');
  return { ...resolved.data, source: resolved.source };
};

/** Sessions del próximo GP (para la tarjeta de carrera en home). */
export const getNextRaceSessions = async (categoryId = 'motogp') => {
  try {
    const events = await getRaceEvents();
    const next = events.find((e) => e.status !== 'FINISHED');
    if (!next) return { source: 'external', event: null, sessions: [] };

    const sessions = asList(
      await pulseliveClient.get(
        `/results/sessions?eventUuid=${next.id}&categoryUuid=${categoryUuidFor(categoryId)}`,
      ),
    );

    const mainRaceId = pickMainRaceSession(sessions)?.id;
    const season = await getCurrentSeason();
    const circuit = await findCircuitByName(next.circuit?.name, season.year).catch(() => null);
    return {
      source: 'external',
      event: {
        raceName: next.sponsored_name?.trim() || next.name,
        circuitName: resolveCircuitDisplayName(next.circuit?.name ?? '—', next),
        locality: next.circuit?.place ?? next.circuit?.city ?? '',
        country: next.country?.name ?? '',
        date: next.date_start,
        round: events.filter((e) => e.status === 'FINISHED').length + 1,
        totalRounds: events.length,
        circuitSvgUrl: circuit?.svgUrl ?? null,
        circuitImageUrl: circuit?.imageUrl ?? null,
      },
      sessions: sessions.map((s) => ({
        name: pulseSessionLabel(s),
        date: formatSessionDate(s.date),
        time: formatSessionTime(s.date),
        highlight: s.id === mainRaceId,
        dateIso: s.date,
      })),
    };
  } catch {
    return { source: 'empty', event: null, sessions: [] };
  }
};

export const getRoundSessions = async (round, categoryId = 'motogp') => {
  const cleanRound = Number.parseInt(round, 10);
  if (!Number.isInteger(cleanRound) || cleanRound < 1) {
    throw new Error('Invalid race round');
  }

  const resolved = await resolveWithFallback(
    () => fetchRoundSessionsMeta(cleanRound, categoryId),
    () => getRoundSessionsFromDb(categoryId, cleanRound),
    pulseOpts,
  );
  return { ...resolved.data, source: resolved.source };
};

export const getRaceResultsByRound = async (round, sessionKey = 'race', categoryId = 'motogp') => {
  const cleanRound = Number.parseInt(round, 10);
  if (!Number.isInteger(cleanRound) || cleanRound < 1) {
    throw new Error('Invalid race round');
  }

  const key = String(sessionKey || 'race').toLowerCase();
  const resolved = await resolveWithFallback(
    () => fetchRaceResultsByRound(cleanRound, key, categoryId),
    () => getRaceResultsFromDb(categoryId, cleanRound, key),
    pulseOpts,
  );
  return { ...resolved.data, source: resolved.source };
};

export { fetchLiveTimingLite, liveTimingSessionKey } from './motogpLiveTiming.service.js';

/** OpenF1-shaped sessions para la home (próximo GP). */
export const getWeekendSessions = async (categoryId = 'motogp') => {
  const payload = await getNextRaceSessions(categoryId);
  const ev = payload.event;
  if (!ev) return { source: payload.source, items: [] };

  const items = (payload.sessions ?? []).map((s, i) => {
    const start = new Date(s.dateIso ?? ev.date);
    const end = new Date(start.getTime() + 60 * 60_000);
    return {
      sessionKey: i + 1,
      meetingKey: ev.round,
      sessionName: s.name,
      sessionType: s.name,
      countryName: ev.country,
      location: ev.locality,
      circuitShortName: ev.circuitName,
      dateStart: start.toISOString(),
      dateEnd: end.toISOString(),
      year: new Date().getFullYear(),
    };
  });

  return { source: payload.source, items };
};

export { getCurrentSeason, getRaceEvents, resolveCircuitDisplayName };
export { lastNameInitial, formatRaceDate, slugify };
