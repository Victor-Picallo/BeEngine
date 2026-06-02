import { jolpicaClient } from '../../external/jolpica/jolpica.client.js';
import { CAREER_HISTORY_PAGE_SIZE } from '../../utils/careerPagination.js';
import { PREFER_DB_FIRST, DB_ENABLED, CURRENT_SEASON_YEAR } from '../../config/env.js';
import { requirePrisma } from '../../lib/prisma.js';
import { seasonIdFor } from '../../repositories/db/season.repository.js';
import { getDriverEntriesForConstructor } from '../../repositories/db/feeder.repository.js';
import {
  getConstructorStandingsFromDb,
  getLastRaceFromDb,
  getRaceResultsFromDb,
} from '../../repositories/db/f1.repository.js';
import {
  getManualConstructorProfile,
  getManualConstructorProfileAggregates,
  isManualConstructorId,
} from './manualConstructorProfile.service.js';
import {
  getConstructorHistoricalStats,
  mergeHistoricalWithLive,
} from '../shared/profileMeta.service.js';

const PROFILE_JOLPICA = { timeoutMs: 10_000 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Caché de stats/bio/maxPts (historial completo). */
const AGGREGATE_CACHE_MS = Math.max(
  60_000,
  parseInt(process.env.CONSTRUCTOR_AGGREGATE_CACHE_MS || String(4 * 60 * 60 * 1000), 10),
);
const aggregateCache = new Map();
const aggregateInflight = new Map();
/** Solo un cálculo de agregados a la vez (evita 429 entre Ferrari, Mercedes, etc.). */
let aggregateGlobalChain = Promise.resolve();

function startAggregateJob(constructorId) {
  const hit = aggregateCache.get(constructorId);
  if (hit && Date.now() - hit.ts < AGGREGATE_CACHE_MS && !hit.partial) {
    return Promise.resolve({
      stats: hit.stats,
      bioText: hit.bioText,
      maxCareerPts: hit.maxCareerPts,
    });
  }

  let inflight = aggregateInflight.get(constructorId);
  if (inflight) return inflight;

  inflight = aggregateGlobalChain
    .then(() => computeConstructorAggregatesPayload(constructorId))
    .then((payload) => {
      writeAggregateCache(constructorId, payload, false);
      aggregateInflight.delete(constructorId);
      return payload;
    })
    .catch((err) => {
      aggregateInflight.delete(constructorId);
      const partial = aggregateCache.get(constructorId);
      if (partial?.stats) {
        return {
          stats: partial.stats,
          bioText: partial.bioText,
          maxCareerPts: partial.maxCareerPts,
          partial: true,
        };
      }
      throw err;
    });

  aggregateInflight.set(constructorId, inflight);
  aggregateGlobalChain = inflight.catch(() => {});
  return inflight;
}

function scheduleAggregatePrefetch(constructorId) {
  if (isManualConstructorId(constructorId)) return;
  if (aggregateInflight.has(constructorId)) return;
  const hit = aggregateCache.get(constructorId);
  if (hit && Date.now() - hit.ts < AGGREGATE_CACHE_MS && !hit.partial) return;

  aggregateGlobalChain = aggregateGlobalChain
    .then(() => sleep(500))
    .then(() => startAggregateJob(constructorId))
    .catch(() => {});
}

/** Menos ráfagas en /profile (evita 429 cuando corre en paralelo con agregados). */
const HISTORY_POOL = 5;
const PROFILE_HISTORY_POOL = 5;
/** Agregados: una temporada tras otra para no disparar 429. */
const AGGREGATE_HISTORY_POOL = 2;
const AGGREGATE_CHUNK_DELAY_MS = 320;
const MAX_GAP_REFETCH_YEARS = 6;
const GAP_REFETCH_ATTEMPTS = 2;
const GAP_MS_BETWEEN_YEARS = 40;
/** Catálogo de temporadas para paginación (no implica pedirlas todas en /profile). */
const HISTORY_YEAR_SPAN = Math.max(
  30,
  parseInt(process.env.CONSTRUCTOR_PROFILE_HIST_SPAN || '76', 10),
);
const HIST_STANDING_CACHE_FRESH_MS = 8 * 60 * 60 * 1000;
const HIST_STANDING_CACHE_STALE_MS = 14 * 24 * 60 * 60 * 1000;

const GP_SHORT_ES = {
  'Bahrain Grand Prix': 'Bahréin',
  'Saudi Arabian Grand Prix': 'Arabia Saudí',
  'Australian Grand Prix': 'Australia',
  'Chinese Grand Prix': 'China',
  'Japanese Grand Prix': 'Japón',
  'Miami Grand Prix': 'Miami',
  'Emilia Romagna Grand Prix': 'Imola',
  'Monaco Grand Prix': 'Mónaco',
  'Spanish Grand Prix': 'España',
  'Canadian Grand Prix': 'Canadá',
  'Austrian Grand Prix': 'Austria',
  'British Grand Prix': 'Gran Bretaña',
  'Hungarian Grand Prix': 'Hungría',
  'Belgian Grand Prix': 'Bélgica',
  'Dutch Grand Prix': 'Países Bajos',
  'Italian Grand Prix': 'Italia',
  'Azerbaijan Grand Prix': 'Azerbaiyán',
  'Singapore Grand Prix': 'Singapur',
  'United States Grand Prix': 'EEUU',
  'Mexico City Grand Prix': 'México',
  'Mexican Grand Prix': 'México',
  'São Paulo Grand Prix': 'Brasil',
  'Brazilian Grand Prix': 'Brasil',
  'Las Vegas Grand Prix': 'Las Vegas',
  'Qatar Grand Prix': 'Qatar',
  'Abu Dhabi Grand Prix': 'Abu Dabi',
};

const sanitizeConstructorId = (id) => {
  const s = String(id || '').trim().toLowerCase();
  if (!/^[a-z0-9_]+$/.test(s)) {
    const err = new Error('Invalid constructor id');
    err.code = 'BAD_REQUEST';
    throw err;
  }
  return s;
};

const gpLabelEs = (raceName) => {
  if (!raceName) return '';
  if (GP_SHORT_ES[raceName]) return GP_SHORT_ES[raceName];
  return raceName.replace(/\s+Grand Prix$/i, '').trim();
};

async function fetchCurrentSeasonSchedule() {
  try {
    const raw = await jolpicaClient.get('/current/races.json', PROFILE_JOLPICA);
    const raceList = raw?.MRData?.RaceTable?.Races ?? [];
    const y = parseInt(raw?.MRData?.RaceTable?.season ?? String(new Date().getUTCFullYear()), 10);
    return {
      seasonYear: Number.isFinite(y) ? y : new Date().getUTCFullYear(),
      scheduledRounds: raceList.length,
    };
  } catch {
    const yr = new Date().getUTCFullYear();
    return { seasonYear: yr, scheduledRounds: 0 };
  }
}

async function fetchConstructorRow(constructorId) {
  const raw = await jolpicaClient.get(`/constructors/${constructorId}.json`, PROFILE_JOLPICA);
  const c = raw?.MRData?.ConstructorTable?.Constructors?.[0];
  if (!c?.constructorId) {
    const err = new Error('Constructor no encontrado');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return {
    constructorId: c.constructorId,
    name: c.name ?? '',
    nationality: c.nationality ?? '',
    wikiUrl: c.url ?? null,
  };
}

async function fetchCurrentDrivers(constructorId) {
  try {
    const raw = await jolpicaClient.get(
      `/current/constructors/${constructorId}/drivers.json`,
      PROFILE_JOLPICA,
    );
    const list = raw?.MRData?.DriverTable?.Drivers ?? [];
    return list.map((d) => ({
      driverId: d.driverId ?? '',
      givenName: d.givenName ?? '',
      familyName: d.familyName ?? '',
      code: (d.code ?? '').trim().toUpperCase(),
      number: d.permanentNumber != null ? parseInt(String(d.permanentNumber), 10) : null,
      nationality: d.nationality ?? '',
    }));
  } catch {
    return [];
  }
}

async function fetchCurrentStandingRow(constructorId) {
  try {
    const raw = await jolpicaClient.get('/current/constructorStandings.json', PROFILE_JOLPICA);
    const sl = raw?.MRData?.StandingsTable?.StandingsLists?.[0] ?? {};
    const list = sl.ConstructorStandings ?? sl.constructorStandings ?? [];
    const hit = list.find((cs) => cs.Constructor?.constructorId === constructorId);
    if (!hit) return null;
    return {
      pos: parseInt(hit.position, 10),
      points: parseFloat(hit.points),
      wins: parseInt(hit.wins ?? '0', 10),
    };
  } catch {
    return null;
  }
}

function dedupeRacesByRound(races) {
  const byRound = new Map();
  for (const race of races) {
    const r = parseInt(race.round, 10);
    if (!Number.isFinite(r)) continue;
    const prev = byRound.get(r);
    if (!prev) {
      byRound.set(r, race);
      continue;
    }
    const pn = (prev.Results ?? []).length;
    const nn = (race.Results ?? []).length;
    if (nn >= pn) byRound.set(r, race);
  }
  return [...byRound.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, race]) => race);
}

async function fetchAllCurrentConstructorResults(constructorId) {
  try {
    const all = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
      const raw = await jolpicaClient.get(
        `/current/constructors/${constructorId}/results.json?limit=${limit}&offset=${offset}`,
        PROFILE_JOLPICA,
      );
      const races = raw?.MRData?.RaceTable?.Races ?? [];
      if (!races.length) break;
      all.push(...races);
      if (races.length < limit) break;
      offset += races.length;
    }
    return dedupeRacesByRound(all);
  } catch {
    return [];
  }
}

function parseRacePositions(results) {
  const nums = (results ?? [])
    .map((r) => {
      const p = parseInt(String(r.position ?? r.positionText ?? ''), 10);
      return Number.isFinite(p) ? p : null;
    })
    .filter((n) => n != null)
    .sort((a, b) => a - b);
  return {
    best: nums[0] ?? null,
    second: nums[1] ?? null,
    points: (results ?? []).reduce((s, r) => s + parseFloat(r.points ?? '0'), 0),
  };
}

function buildCurrentSeasonRaces(races) {
  let cum = 0;
  return races.map((race) => {
    const { best, second, points } = parseRacePositions(race.Results);
    cum += points;
    return {
      round: parseInt(race.round, 10),
      gp: gpLabelEs(race.raceName),
      d1Pos: best,
      d2Pos: second,
      points,
      cumPts: cum,
    };
  });
}

async function mapPool(items, poolSize, fn, opts = {}) {
  const out = [];
  for (let i = 0; i < items.length; i += poolSize) {
    if (opts.chunkDelayMs && i > 0) await sleep(opts.chunkDelayMs);
    const slice = items.slice(i, i + poolSize);
    const chunk = await Promise.all(slice.map((item) => fn(item)));
    out.push(...chunk);
    if (opts.onChunk) opts.onChunk(out);
  }
  return out;
}

function statsFromCareerHistory(careerHistory) {
  return {
    championships: careerHistory.filter((h) => h.titleWon).length,
    totalWins: careerHistory.reduce((s, h) => s + h.wins, 0),
    totalPodiums: careerHistory.reduce((s, h) => s + h.podiums, 0),
    totalPoles: careerHistory.reduce((s, h) => s + h.poles, 0),
  };
}

function writeAggregateCache(constructorId, payload, partial = false) {
  aggregateCache.set(constructorId, { ts: Date.now(), partial, ...payload });
}

function pickConstructorStandingRow(list, constructorId) {
  if (!Array.isArray(list) || !list.length) return null;
  const id = String(constructorId || '').toLowerCase();
  const hit = list.find((cs) => String(cs.Constructor?.constructorId || '').toLowerCase() === id);
  if (hit) return hit;
  return list.length === 1 ? list[0] : null;
}

function constructorStandingsListFromRaw(raw) {
  const table = raw?.MRData?.StandingsTable;
  if (!table) return { list: [], round: undefined };
  const lists = table.StandingsLists;
  const sl =
    (Array.isArray(lists) && lists.length ? lists[lists.length - 1] : null) ??
  table.StandingsLists?.[0] ??
    {};
  const fromList = sl.ConstructorStandings ?? sl.constructorStandings ?? [];
  if (fromList.length) return { list: fromList, round: sl?.round ?? table?.round };
  const flat = table.ConstructorStandings ?? table.constructorStandings ?? [];
  if (flat.length) return { list: flat, round: table?.round };
  return { list: [], round: table?.round };
}

function parseStandingRow(year, raw, constructorId) {
  const table = raw?.MRData?.StandingsTable;
  const { list, round: listRound } = constructorStandingsListFromRaw(raw);
  const row = pickConstructorStandingRow(list, constructorId);
  if (!row) return null;
  const standingsRound = parseInt(String(listRound ?? table?.round ?? '0'), 10);
  return {
    year,
    wins: parseInt(row.wins ?? '0', 10),
    podiums: 0,
    poles: 0,
    pts: parseFloat(row.points ?? '0'),
    pos: parseInt(row.position, 10),
    standingsRound,
  };
}

async function fetchConstructorStandingForYear(year, constructorId, seasonYear, opts = {}) {
  const attempts = Number.isFinite(opts.attempts) && opts.attempts > 0 ? opts.attempts : 2;
  const hist = year < seasonYear;
  const jopts = hist
    ? {
        ...PROFILE_JOLPICA,
        freshTtlMs: HIST_STANDING_CACHE_FRESH_MS,
        staleTtlMs: HIST_STANDING_CACHE_STALE_MS,
      }
    : PROFILE_JOLPICA;

  const paths = [
    `/${year}/constructors/${constructorId}/constructorStandings.json`,
    `/${year}/constructorStandings.json`,
  ];

  for (let a = 1; a <= attempts; a += 1) {
    for (const path of paths) {
      try {
        const raw = await jolpicaClient.get(path, jopts);
        const row = parseStandingRow(year, raw, constructorId);
        if (row) return row;
      } catch {
        /* siguiente path o reintento */
      }
    }
    if (a < attempts) await sleep(220 * a);
  }
  return null;
}

function interiorGapYears(rows, seasonYear, maxYears) {
  const sorted = [...rows].sort((a, b) => a.year - b.year);
  const out = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    let y = sorted[i].year + 1;
    const hi = sorted[i + 1].year - 1;
    while (y <= hi && y <= seasonYear) {
      out.push(y);
      if (out.length >= maxYears) return out;
      y += 1;
    }
  }
  return out;
}

function constructorYearSlots(seasonYear, span) {
  const slots = [];
  for (let y = seasonYear; y >= seasonYear - span; y -= 1) slots.push(y);
  return slots;
}

/** Solo los años de la página pedida (máx. 10 llamadas a Jolpica por /profile). */
function yearsSliceForCareerPage(seasonYear, span, careerPage) {
  // slots = [temporada actual … más antigua]; página 1 = bloque más reciente
  const slots = constructorYearSlots(seasonYear, span);
  const n = slots.length;
  const pageSize = CAREER_HISTORY_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(n / pageSize));
  const p = Math.min(Math.max(1, careerPage), totalPages);
  const start = (p - 1) * pageSize;
  const end = Math.min(start + pageSize, n);
  return { years: slots.slice(start, end), totalYears: n, totalPages, page: p, pageSize };
}

function withTitleWonRows(merged, seasonYear, scheduledRounds) {
  return merged.map((h) => {
    const seasonCompleteRow =
      h.year < seasonYear ||
      (h.year === seasonYear && scheduledRounds > 0 && h.standingsRound >= scheduledRounds);
    return {
      ...h,
      titleWon: h.pos === 1 && seasonCompleteRow,
    };
  });
}

async function standingsHistoryForYears(years, constructorId, seasonYear, opts = {}) {
  const pool = opts.poolSize ?? HISTORY_POOL;
  const historyParts = await mapPool(
    years,
    pool,
    (year) => fetchConstructorStandingForYear(year, constructorId, seasonYear),
    { chunkDelayMs: opts.chunkDelayMs ?? 0, onChunk: opts.onChunk },
  );
  const present = historyParts.filter(Boolean);
  const byYear = new Map();
  for (const h of present) {
    byYear.set(h.year, h);
  }

  if (!opts.skipGapRefetch) {
    const gapYears = interiorGapYears(present, seasonYear, MAX_GAP_REFETCH_YEARS);
    for (const y of gapYears) {
      await sleep(GAP_MS_BETWEEN_YEARS);
      const row = await fetchConstructorStandingForYear(y, constructorId, seasonYear, {
        attempts: GAP_REFETCH_ATTEMPTS,
      });
      if (row) byYear.set(row.year, row);
    }
  }

  if (opts.retryMissing) {
    const missing = years.filter((y) => !byYear.has(y));
    for (const y of missing) {
      await sleep(180);
      const row = await fetchConstructorStandingForYear(y, constructorId, seasonYear, {
        attempts: 3,
      });
      if (row) byYear.set(row.year, row);
    }
  }

  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

function buildBio(c, standing, seasonYear, drivers, careerHistory, statsOverride = null) {
  const nat = c.nationality || '—';
  const names = drivers.map((d) => `${d.givenName} ${d.familyName}`).filter(Boolean);
  const pair = names.length >= 2 ? `${names[0]} y ${names[1]}` : names[0] || 'sus pilotos';
  const champs =
    statsOverride?.championships ??
    careerHistory.filter((h) => h.titleWon).length;
  const st = standing
    ? `En ${seasonYear} ocupa el puesto P${standing.pos} en el mundial de constructores con ${standing.points} puntos${standing.wins ? ` y ${standing.wins} victorias` : ''}.`
    : '';
  return (
    `${c.name} es una escudería de Fórmula 1 (${nat}). ` +
    `${st} ` +
    `Los pilotos inscritos esta temporada son ${pair}. ` +
    (champs > 0
      ? `Ha sido campeona de constructores ${champs} ${champs === 1 ? 'vez' : 'veces'}. `
      : '') +
    (c.wikiUrl ? 'Más contexto en la Wikipedia enlazada desde Ergast/Jolpica.' : '')
  );
}

function buildAggregatePayload(c, standing, seasonYear, drivers, careerHistory) {
  const stats = statsFromCareerHistory(careerHistory);
  const bioText = buildBio(c, standing, seasonYear, drivers, careerHistory);
  const maxCareerPts = careerHistory.length ? Math.max(1, ...careerHistory.map((h) => h.pts)) : 1;
  return { stats, bioText, maxCareerPts };
}

async function computeConstructorAggregatesPayload(constructorId) {
  const [{ seasonYear, scheduledRounds }, [c, drivers, standing]] = await Promise.all([
    fetchCurrentSeasonSchedule(),
    Promise.all([
      fetchConstructorRow(constructorId),
      fetchCurrentDrivers(constructorId),
      fetchCurrentStandingRow(constructorId),
    ]),
  ]);

  const years = constructorYearSlots(seasonYear, HISTORY_YEAR_SPAN);
  let lastCareerHistory = [];

  const onChunk = (parts) => {
    const present = parts.filter(Boolean);
    if (!present.length) return;
    const byYear = new Map();
    for (const h of present) byYear.set(h.year, h);
    lastCareerHistory = withTitleWonRows(
      [...byYear.values()].sort((a, b) => a.year - b.year),
      seasonYear,
      scheduledRounds,
    );
    const payload = buildAggregatePayload(c, standing, seasonYear, drivers, lastCareerHistory);
    writeAggregateCache(constructorId, payload, true);
  };

  const merged = await standingsHistoryForYears(years, constructorId, seasonYear, {
    poolSize: AGGREGATE_HISTORY_POOL,
    chunkDelayMs: AGGREGATE_CHUNK_DELAY_MS,
    skipGapRefetch: true,
    retryMissing: true,
    onChunk,
  });
  const careerHistory = withTitleWonRows(merged, seasonYear, scheduledRounds);

  if (!careerHistory.length && lastCareerHistory.length) {
    return buildAggregatePayload(c, standing, seasonYear, drivers, lastCareerHistory);
  }

  return buildAggregatePayload(c, standing, seasonYear, drivers, careerHistory);
}

/**
 * Totales globales reales (títulos, victorias, bio). Pesado; usar en 2ª petición + caché.
 */
const AGGREGATES_HTTP_WAIT_MS = Math.max(
  5_000,
  parseInt(process.env.CONSTRUCTOR_AGGREGATES_WAIT_MS || '22000', 10),
);

function aggregateResponseFromCache(hit) {
  return {
    stats: hit.stats,
    bioText: hit.bioText,
    maxCareerPts: hit.maxCareerPts,
    partial: Boolean(hit.partial),
  };
}

async function buildQuickLiveAggregatePayload(constructorId) {
  const historical = await getConstructorHistoricalStats(constructorId);
  if (!historical) return null;

  const [{ seasonYear }, standing] = await Promise.all([
    fetchCurrentSeasonSchedule(),
    fetchCurrentStandingRow(constructorId),
  ]);

  const merged = mergeHistoricalWithLive(historical, { standing, seasonYear });
  const hit = aggregateCache.get(constructorId);

  return {
    stats: merged.stats,
    bioText: hit?.bioText ?? null,
    maxCareerPts: hit?.maxCareerPts ?? merged.maxCareerPts,
    partial: true,
  };
}

export async function getConstructorProfileAggregates(rawConstructorId) {
  const constructorId = sanitizeConstructorId(rawConstructorId);
  if (isManualConstructorId(constructorId)) {
    return getManualConstructorProfileAggregates(constructorId);
  }

  const hit = aggregateCache.get(constructorId);
  if (hit && Date.now() - hit.ts < AGGREGATE_CACHE_MS && !hit.partial) {
    return aggregateResponseFromCache(hit);
  }

  if (!aggregateInflight.has(constructorId)) {
    scheduleAggregatePrefetch(constructorId);
  }

  const quick = await buildQuickLiveAggregatePayload(constructorId);
  if (quick) return quick;

  const job = aggregateInflight.get(constructorId) ?? startAggregateJob(constructorId);
  const raced = await Promise.race([job, sleep(AGGREGATES_HTTP_WAIT_MS).then(() => null)]);

  if (raced && !raced.partial) {
    return { ...raced, partial: false };
  }
  if (raced) {
    return { ...raced, partial: true };
  }

  const partial = aggregateCache.get(constructorId);
  if (partial?.stats) return aggregateResponseFromCache(partial);

  return job;
}

async function getConstructorProfileFromDb(rawConstructorId) {
  if (!DB_ENABLED) return null;
  const constructorId = sanitizeConstructorId(rawConstructorId);
  const prisma = requirePrisma();
  const seasonId = seasonIdFor('f1');
  const cs = await prisma.constructorSeason.findUnique({
    where: { seasonId_constructorId: { seasonId, constructorId } },
    include: { constructor: true },
  });
  if (!cs) return null;

  const standings = await getConstructorStandingsFromDb();
  const standingRow = standings?.find((c) => c.constructorId === constructorId) ?? null;
  const standing = standingRow
    ? { pos: standingRow.pos, points: standingRow.points, wins: standingRow.wins ?? 0 }
    : null;

  const driverEntries = await getDriverEntriesForConstructor('f1', constructorId);
  const drivers = driverEntries.map((e) => ({
    driverId: e.driverId,
    givenName: e.driver?.givenName ?? '',
    familyName: e.driver?.familyName ?? '',
    displayName: e.displayName,
  }));

  const driverIds = new Set(driverEntries.map((e) => e.driverId));
  const lastRace = await getLastRaceFromDb();
  const maxRound = lastRace?.round ?? 0;
  const currentSeason = [];
  let cum = 0;
  for (let r = 1; r <= maxRound; r += 1) {
    const race = await getRaceResultsFromDb(r);
    if (!race?.results?.length) continue;
    const teamRes = race.results.filter((x) => driverIds.has(x.driverId));
    if (!teamRes.length) continue;
    const sorted = [...teamRes].sort(
      (a, b) => parseInt(a.position, 10) - parseInt(b.position, 10),
    );
    const points = sorted.reduce((s, x) => s + (parseFloat(x.points) || 0), 0);
    cum += points;
    currentSeason.push({
      round: r,
      gp: gpLabelEs(race.raceName ?? ''),
      d1Pos: parseInt(sorted[0]?.position, 10) || 0,
      d2Pos: parseInt(sorted[1]?.position, 10) || 0,
      points,
      cumPts: cum,
    });
  }

  const seasonYear = CURRENT_SEASON_YEAR;
  const c = {
    constructorId,
    name: cs.name,
    nationality: standingRow?.nationality ?? '',
    wikiUrl: '',
  };
  const historical = await getConstructorHistoricalStats(constructorId);
  const currentYearRow = {
    year: seasonYear,
    team: cs.name,
    races: currentSeason.length,
    wins: standingRow?.wins ?? 0,
    podiums: 0,
    poles: 0,
    pts: standingRow?.points ?? 0,
    pos: standingRow?.pos ?? null,
    seasonComplete: false,
    titleWon: false,
  };

  let stats;
  let bioText;
  let statsSource = 'local';
  let aggregatesPending = false;

  if (historical) {
    const merged = mergeHistoricalWithLive(historical, {
      standing,
      seasonYear,
      currentYearRow,
    });
    stats = merged.stats;
    bioText = buildBio(c, standing, seasonYear, drivers, [currentYearRow], merged.stats);
    statsSource = standing ? 'live' : 'local';
  } else {
    stats = {
      championships: 0,
      totalWins: standingRow?.wins ?? 0,
      totalPodiums: 0,
      totalPoles: 0,
    };
    bioText = buildBio(c, standing, seasonYear, drivers, [currentYearRow], stats);
    aggregatesPending = true;
    scheduleAggregatePrefetch(constructorId);
  }

  return {
    source: 'db',
    constructorId,
    name: cs.name,
    nationality: c.nationality,
    wikiUrl: '',
    currentSeasonYear: seasonYear,
    standing,
    stats,
    bioText,
    drivers,
    currentSeason,
    careerHistory: [currentYearRow],
    careerHistoryPagination: null,
    careerHistoryError: false,
    aggregatesPending,
    statsSource,
  };
}

/**
 * Ficha rápida: temporada actual + solo ~10 años de historial (página actual).
 */
export async function getConstructorProfile(rawConstructorId, opts = {}) {
  const careerPage = Math.max(1, parseInt(String(opts.careerPage ?? '1'), 10) || 1);
  const constructorId = sanitizeConstructorId(rawConstructorId);
  if (isManualConstructorId(constructorId)) {
    return getManualConstructorProfile(constructorId);
  }

  if (PREFER_DB_FIRST && opts.preferDb !== false) {
    const fromDb = await getConstructorProfileFromDb(rawConstructorId);
    if (fromDb) return fromDb;
  }

  const { seasonYear, scheduledRounds } = await fetchCurrentSeasonSchedule();
  const slice = yearsSliceForCareerPage(seasonYear, HISTORY_YEAR_SPAN, careerPage);

  const [c, drivers, standing, races, merged] = await Promise.all([
    fetchConstructorRow(constructorId),
    fetchCurrentDrivers(constructorId),
    fetchCurrentStandingRow(constructorId),
    fetchAllCurrentConstructorResults(constructorId),
    standingsHistoryForYears(slice.years, constructorId, seasonYear, {
      skipGapRefetch: true,
      retryMissing: true,
      poolSize: PROFILE_HISTORY_POOL,
    }),
  ]);

  const currentSeason = buildCurrentSeasonRaces(races);
  const careerHistory = withTitleWonRows(merged, seasonYear, scheduledRounds);
  const careerHistoryError =
    slice.years.length > 0 && careerHistory.length === 0;

  const historical = await getConstructorHistoricalStats(constructorId);
  const agg = aggregateCache.get(constructorId);
  const aggFresh = agg && Date.now() - agg.ts < AGGREGATE_CACHE_MS && !agg.partial;
  const currentYearRow = careerHistory.find((h) => h.year === seasonYear) ?? null;

  let stats;
  let bioText;
  let aggregatesPending = false;
  /** local = solo archivo; live = baseline + standing 2026; api = agregados Jolpica completos */
  let statsSource = 'local';

  if (aggFresh) {
    stats = agg.stats;
    bioText = agg.bioText;
    statsSource = 'api';
  } else if (historical) {
    const merged = mergeHistoricalWithLive(historical, {
      standing,
      seasonYear,
      currentYearRow,
    });
    stats = merged.stats;
    bioText = buildBio(c, standing, seasonYear, drivers, careerHistory, merged.stats);
    statsSource = standing || currentYearRow ? 'live' : 'local';
    aggregatesPending = true;
    scheduleAggregatePrefetch(constructorId);
  } else {
    aggregatesPending = true;
    stats = { championships: 0, totalWins: 0, totalPodiums: 0, totalPoles: 0 };
    bioText = 'Calculando resumen histórico completo…';
    scheduleAggregatePrefetch(constructorId);
  }

  const maxPtsPage = careerHistory.length ? Math.max(1, ...careerHistory.map((h) => h.pts)) : 1;
  const maxPts = aggFresh ? agg.maxCareerPts : (historical?.maxCareerPts ?? maxPtsPage);

  let careerHistoryPagination = null;
  if (slice.totalYears > CAREER_HISTORY_PAGE_SIZE) {
    careerHistoryPagination = {
      page: slice.page,
      pageSize: slice.pageSize,
      totalYears: slice.totalYears,
      totalPages: slice.totalPages,
      maxPts,
    };
  }

  return {
    source: 'external',
    constructorId: c.constructorId,
    name: c.name,
    nationality: c.nationality,
    wikiUrl: c.wikiUrl,
    currentSeasonYear: seasonYear,
    standing,
    stats,
    bioText,
    drivers,
    currentSeason,
    careerHistory,
    careerHistoryPagination,
    careerHistoryError,
    aggregatesPending,
    statsSource,
  };
}
