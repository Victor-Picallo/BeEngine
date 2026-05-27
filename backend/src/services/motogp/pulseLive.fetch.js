/**
 * Lecturas Pulse Live sin fallback DB (sync + liveFn de servicios).
 */
import {
  pulseliveClient,
  MOTOGP_CATEGORY_UUID,
  MOTO2_CATEGORY_UUID,
  MOTO3_CATEGORY_UUID,
} from '../../external/motogp/pulselive.client.js';
import { getRidersIndex } from './motogpRiders.service.js';
import { getCircuits, findCircuitByName } from './motogpCircuits.service.js';
import { getSessionSectors, normalizeRiderShortName } from './motogpSectors.service.js';
import { pickCircuitMapUrl } from './motogpCircuitMedia.js';
import { getTeamsIndex, enrichStandingRow } from './motogpTeams.service.js';
import { resolveOfficialConstructorSlug } from '../shared/profileMeta.service.js';
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
const normLabel = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const resolveCircuitDisplayName = (circuitName, event = null, localRow = null) => {
  const label = String(circuitName ?? '').trim();
  const eventLabel = `${event?.sponsored_name ?? ''} ${event?.name ?? ''}`.trim();
  const fromCircuit = event?.circuit?.name?.trim() ?? '';

  if (label && !isTestEventLabel(label) && normLabel(label) !== normLabel(eventLabel)) {
    return label;
  }
  if (localRow?.circuitName && !isTestEventLabel(localRow.circuitName)) {
    return localRow.circuitName;
  }
  if (fromCircuit && !isTestEventLabel(fromCircuit)) return fromCircuit;
  return label || fromCircuit || '—';
};

const CATEGORY_UUIDS = {
  motogp: MOTOGP_CATEGORY_UUID,
  moto2: MOTO2_CATEGORY_UUID,
  moto3: MOTO3_CATEGORY_UUID,
};

export const categoryUuidFor = (id) => CATEGORY_UUIDS[id] ?? MOTOGP_CATEGORY_UUID;

const asList = (raw) => (Array.isArray(raw) ? raw : raw?.value ?? []);

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const isTestEventLabel = (name) => /\btest\b/i.test(String(name ?? '').trim());
const isTestEvent = (e) =>
  Boolean(e?.test) || isTestEventLabel(e?.sponsored_name) || isTestEventLabel(e?.name);

const eventFinished = (e) => {
  const st = String(e?.status ?? '').toUpperCase();
  return st === 'FINISHED' || st === 'OFFICIAL';
};

let seasonCache = null;
let seasonCacheTs = 0;
const SEASON_CACHE_MS = 6 * 60 * 60_000;

export const getCurrentSeason = async () => {
  const now = Date.now();
  if (seasonCache && now - seasonCacheTs < SEASON_CACHE_MS) return seasonCache;
  const raw = await pulseliveClient.get('/results/seasons', { freshTtlMs: SEASON_CACHE_MS });
  const list = asList(raw);
  const current = list.find((s) => s.current) ?? list[0];
  if (!current?.id) throw new Error('No current MotoGP season');
  seasonCache = current;
  seasonCacheTs = now;
  return current;
};

export const getRaceEvents = async () => {
  const season = await getCurrentSeason();
  const events = await pulseliveClient.get(`/results/events?seasonUuid=${season.id}`, {
    freshTtlMs: 5 * 60_000,
  });
  return asList(events).filter((e) => !isTestEvent(e));
};

const motoFeederApi = (categoryId) => {
  if (categoryId === 'moto2') {
    return {
      enrichDrivers: enrichMoto2DriverStandings,
      enrichTeams: enrichMoto2TeamStandings,
    };
  }
  if (categoryId === 'moto3') {
    return {
      enrichDrivers: enrichMoto3DriverStandings,
      enrichTeams: enrichMoto3TeamStandings,
    };
  }
  return null;
};

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

const aggregateStandingsByOfficialTeam = async (classificationRows, categoryId = 'motogp') => {
  const bySlug = new Map();
  for (const r of classificationRows) {
    const teamName = r.team?.name ?? r.constructor?.name;
    if (!teamName) continue;
    const officialSlug =
      categoryId === 'motogp'
        ? await resolveOfficialConstructorSlug(
            r.team?.id ?? r.team?.uuid ?? null,
            slugify(teamName),
            teamName,
          )
        : slugify(teamName);
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

export const normalizeCalendar = (events) =>
  events.map((e, i) => ({
    round: i + 1,
    raceName: e.sponsored_name?.trim() || e.name,
    circuitName:
      String(e.circuit?.name ?? '').trim() ||
      resolveCircuitDisplayName(e.circuit?.name ?? '—', e),
    circuitId: e.circuit?.id ?? null,
    locality: e.circuit?.place ?? e.circuit?.city ?? '',
    country: e.country?.name ?? e.circuit?.nation ?? e.circuit?.country ?? '',
    date: e.date_start?.slice(0, 10) ?? '',
    time: e.date_start?.includes('T') ? e.date_start.split('T')[1]?.slice(0, 8) : null,
    status: e.status,
    eventId: e.id,
    resultsAvailable: eventFinished(e),
  }));

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

export const fetchDriverStandings = async (categoryId = 'motogp') => {
  const season = await getCurrentSeason();
  const raw = await pulseliveClient.get(
    `/results/standings?seasonUuid=${season.id}&categoryUuid=${categoryUuidFor(categoryId)}`,
  );
  let items = await enrichDriversWithTeamsAndPortraits(
    normalizeDriverStandings(raw),
    season.year,
    categoryId,
  );
  const feeder = motoFeederApi(categoryId);
  if (feeder) items = feeder.enrichDrivers(items);
  return items;
};

export const fetchOfficialTeamsGrid = async (categoryId = 'motogp') => {
  const season = await getCurrentSeason();
  const [raw, teamsIdx] = await Promise.all([
    pulseliveClient.get(
      `/results/standings?seasonUuid=${season.id}&categoryUuid=${categoryUuidFor(categoryId)}`,
    ),
    getTeamsIndex(season.year, categoryId),
  ]);
  const agg = await aggregateStandingsByOfficialTeam(raw?.classification ?? [], categoryId);
  const items = teamsIdx.list
    .map((t) => {
      const stats = agg.get(t.constructorId) ?? { points: 0, wins: 0 };
      return {
        pos: 0,
        team: t.name,
        constructorId: t.constructorId,
        teamId: t.teamId,
        points: stats.points,
        wins: stats.wins,
        nationality: '',
        teamColor: t.color,
        logoUrl: t.logoUrl ?? null,
        bikeImageUrl: t.bikeImageUrl,
      };
    })
    .sort((a, b) => b.points - a.points || a.team.localeCompare(b.team))
    .map((row, i) => ({ ...row, pos: i + 1 }));
  const feeder = motoFeederApi(categoryId);
  return feeder ? feeder.enrichTeams(items) : items;
};

export const fetchCalendar = async (categoryId = 'motogp') => {
  const season = await getCurrentSeason();
  const events = await getRaceEvents();
  let items = normalizeCalendar(events);
  try {
    const { items: circuitList } = await getCircuits(season.year);
    const bySlug = new Map(circuitList.map((c) => [c.slug, c]));
    const byId = new Map(circuitList.map((c) => [c.circuitId, c]));
    items = items.map((row) => {
      const c =
        (row.circuitId && byId.get(row.circuitId)) ||
        bySlug.get(slugify(row.circuitName)) ||
        null;
      if (!c) return row;
      return {
        ...row,
        circuitImageUrl: c.imageUrl ?? null,
        circuitSvgUrl: c.svgUrl ?? null,
      };
    });
  } catch {
    /* sin SVG */
  }
  return items;
};

const fetchEventSessions = async (event, categoryId = 'motogp') => {
  if (!event?.id) return [];
  return asList(
    await pulseliveClient.get(
      `/results/sessions?eventUuid=${event.id}&categoryUuid=${categoryUuidFor(categoryId)}`,
    ),
  );
};

const parseGapNum = (raw) => {
  const g = String(raw ?? '')
    .trim()
    .replace(/^\+/, '')
    .replace(/s$/i, '');
  if (!g || g === '0.000' || g === '0') return 0;
  const n = Number.parseFloat(g);
  return Number.isFinite(n) ? n : null;
};

const formatGapSeconds = (raw) => {
  const g = String(raw ?? '').trim();
  if (!g || g === '0.000' || g === '0') return '—';
  if (g.includes('+') || g.includes(':')) return g;
  return `+${g}s`;
};

/** Columna GAP en carrera: tiempo total del líder; diferencia al líder para el resto. */
const formatRaceGap = (r) => {
  if (r.position === 1) return '—';
  return formatGapSeconds(r.gap?.first);
};

/** Diferencia al piloto de delante (gap Pulse o delta entre gaps al líder). */
const formatRaceInterval = (r, allRaw = []) => {
  if (r.position === 1) return '—';
  const direct = r.gap?.second ?? r.gap?.prev ?? r.gap?.previous;
  if (direct && direct !== '0.000' && direct !== '0') return formatGapSeconds(direct);
  const ahead = allRaw.find((x) => x.position === r.position - 1);
  if (!ahead) return '—';
  const cur = parseGapNum(r.gap?.first);
  const prev = parseGapNum(ahead.gap?.first);
  if (cur == null || prev == null || cur < prev) return '—';
  const diff = cur - prev;
  if (diff <= 0) return '—';
  return `+${diff.toFixed(3)}s`;
};

const formatBestLapTime = (r) => r.best_lap?.time ?? '—';

const formatClassificationTime = (r, sessionType) => {
  if (sessionType !== 'RAC' && sessionType !== 'SPR') {
    return formatBestLapTime(r);
  }
  if (r.position === 1) return r.time ?? '—';
  return formatRaceGap(r);
};

const normalizeClassification = (cls, session) => {
  const sessionType = session?.type ?? 'RAC';
  const isRace = sessionType === 'RAC' || sessionType === 'SPR';
  const rawRows = cls?.classification ?? [];
  return rawRows.map((r) => ({
    position: r.position,
    driver: r.rider?.full_name ?? '—',
    driverId: r.rider?.riders_api_uuid ?? r.rider?.id ?? slugify(r.rider?.full_name),
    team: r.team?.name ?? r.constructor?.name ?? '—',
    constructorId: slugify(r.constructor?.name ?? r.team?.name),
    points: sessionType === 'RAC' ? Number(r.points) || 0 : 0,
    time: formatClassificationTime(r, sessionType),
    gap: isRace ? formatRaceGap(r) : '—',
    interval: isRace ? formatRaceInterval(r, rawRows) : '—',
    bestLap: formatBestLapTime(r),
    raceTime: isRace && r.position === 1 ? r.time ?? null : null,
    grid: Number(r.start_position ?? r.grid ?? r.position) || null,
    laps: Number(r.total_laps) || 0,
    status: r.status ?? 'Finished',
    number: r.rider?.number ?? null,
  }));
};

const enrichRaceResultsHeadshots = async (rows, seasonYear, categoryId = 'motogp') => {
  try {
    const year =
      Number.parseInt(String(seasonYear ?? new Date().getFullYear()), 10) ||
      new Date().getFullYear();
    const ridersIdx = await getRidersIndex();
    const teamsIdx = await getTeamsIndex(year, categoryId);
    return rows.map((r) => {
      const rider =
        ridersIdx.byId.get(r.driverId) ?? ridersIdx.bySlug.get(slugify(r.driver));
      const teamRow = teamsIdx.bySlug.get(slugify(r.team));
      return {
        ...r,
        headshotUrl: rider?.portraitUrl ?? null,
        teamColor: teamRow?.color ?? null,
      };
    });
  } catch {
    return rows;
  }
};

export const fetchRoundSessionsMeta = async (round, categoryId = 'motogp') => {
  const cleanRound = Number.parseInt(round, 10);
  const season = await getCurrentSeason();
  const events = await getRaceEvents();
  const event = events[cleanRound - 1];
  if (!event) throw new Error(`No event for round ${cleanRound}`);

  const sessions = await fetchEventSessions(event, categoryId);
  const circuit = await findCircuitByName(event.circuit?.name, season.year).catch(() => null);
  const byKey = new Map();
  for (const s of sessions) {
    const sessionKey = pulseSessionToKey(s);
    byKey.set(sessionKey, {
      sessionKey,
      label: pulseSessionLabel(s),
      date: s.date ?? null,
      status: s.status ?? null,
      hasResults: sessionHasDisplayableData(s),
      isLive: sessionIsLive(s),
    });
  }

  return {
    round: cleanRound,
    raceName: event.sponsored_name?.trim() || event.name,
    circuitName: resolveCircuitDisplayName(event.circuit?.name ?? '—', event),
    circuitSvgUrl: pickCircuitMapUrl(circuit),
    circuitImageUrl: circuit?.imageUrl ?? null,
    sessions: [...byKey.values()],
  };
};

export const fetchRaceResultsByRound = async (
  round,
  sessionKey = 'race',
  categoryId = 'motogp',
) => {
  const cleanRound = Number.parseInt(round, 10);
  const season = await getCurrentSeason();
  const events = await getRaceEvents();
  const event = events[cleanRound - 1];
  if (!event) throw new Error(`No event for round ${cleanRound}`);

  const sessions = await fetchEventSessions(event, categoryId);
  const session = resolvePulseSession(sessions, sessionKey) ?? pickMainRaceSession(sessions);
  if (!session?.id) throw new Error('No session for round');

  const circuit = await findCircuitByName(event.circuit?.name, season.year).catch(() => null);
  const live = sessionIsLive(session);
  const official = sessionHasResults(session);

  const base = {
    round: cleanRound,
    raceName: event.sponsored_name?.trim() || event.name,
    circuitName: resolveCircuitDisplayName(event.circuit?.name ?? '—', event),
    circuitSvgUrl: pickCircuitMapUrl(circuit),
    circuitImageUrl: circuit?.imageUrl ?? null,
    date: session.date?.slice(0, 10) ?? event.date_start?.slice(0, 10) ?? '',
    sessionKey: pulseSessionToKey(session),
    sessionLabel: pulseSessionLabel(session),
    sessionStatus: session.status ?? null,
    sessionPending: live && !official,
    live: live && !official,
    results: [],
  };

  if (!sessionHasDisplayableData(session)) return base;

  const clsTtl = live ? 8_000 : 60_000;
  let rows = [];
  try {
    const cls = await pulseliveClient.get(
      `/results/session/${session.id}/classification?seasonYear=${season.year}&test=false`,
      { freshTtlMs: clsTtl },
    );
    rows = normalizeClassification(cls, session);
  } catch {
    rows = [];
  }

  const enriched = await enrichRaceResultsHeadshots(rows, season.year, categoryId);
  const hasRows = enriched.length > 0;

  let sectorByDriver = new Map();
  try {
    const sectorPack = await getSessionSectors(cleanRound, sessionKey, categoryId, {
      cacheMs: 60_000,
    });
    for (const s of sectorPack.riders ?? []) {
      if (s.fullName) sectorByDriver.set(String(s.fullName).toLowerCase(), s);
      sectorByDriver.set(normalizeRiderShortName(s.riderShortName), s);
    }
  } catch {
    sectorByDriver = new Map();
  }

  const lookupSector = (driver) =>
    sectorByDriver.get(String(driver ?? '').toLowerCase()) ??
    sectorByDriver.get(
      normalizeRiderShortName(
        `${String(driver ?? '').split(/\s+/)[0]?.[0] ?? ''}.${String(driver ?? '').split(/\s+/).pop() ?? ''}`,
      ),
    ) ??
    null;

  return {
    ...base,
    sessionPending: live && hasRows && !official,
    live: live && hasRows && !official,
    results: enriched.map((r) => {
      const sec = lookupSector(r.driver);
      const bestLap =
        r.bestLap && r.bestLap !== '—' ? r.bestLap : sec?.bestLap && sec.bestLap !== '—' ? sec.bestLap : null;
      return {
        position: r.position,
        driver: r.driver,
        driverId: r.driverId,
        team: r.team,
        constructorId: r.constructorId,
        teamColor: r.teamColor ?? null,
        headshotUrl: r.headshotUrl ?? null,
        grid: r.grid ?? r.position,
        laps: r.laps,
        status: r.status,
        points: r.points,
        time: r.time,
        gap: r.gap ?? null,
        interval: r.interval ?? null,
        bestLap,
        raceTime: r.raceTime ?? null,
        number: r.number ?? null,
      };
    }),
  };
};

export const fetchLastRace = async (categoryId = 'motogp') => {
  const season = await getCurrentSeason();
  const events = await getRaceEvents();
  const finished = events.filter((e) => eventFinished(e));
  const last = finished[finished.length - 1];
  if (!last) throw new Error('No finished races');
  const round = finished.length;
  return fetchRaceResultsByRound(round, 'race', categoryId);
};

/** Rondas terminadas + sesiones con datos para sync DB. */
export const listSyncableRounds = async (categoryId = 'motogp') => {
  const events = await getRaceEvents();
  const calendar = normalizeCalendar(events);
  const finishedRounds = calendar.filter((r) => r.resultsAvailable).map((r) => r.round);
  return { calendar, finishedRounds, events };
};
