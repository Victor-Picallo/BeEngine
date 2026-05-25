import { jolpicaClient } from '../../external/jolpica/jolpica.client.js';
import { CAREER_HISTORY_PAGE_SIZE, paginateCareerHistoryByRecentPage } from '../../utils/careerPagination.js';
import {
  getDriverHistoricalStats,
  mergeDriverHistoricalWithLive,
} from '../../data/f1/f1DriverHistoricalStats.js';

/** Driver profile hits Jolpica many times; allow a bit more than the global default. */
const PROFILE_JOLPICA = { timeoutMs: 8_000 };
/** Parallel driverStandings fetches (per season). Keep moderate to reduce 429s. */
const STANDINGS_POOL = 4;
const PROFILE_STANDINGS_POOL = 5;
const DRIVER_HIST_SPAN = Math.max(
  30,
  parseInt(process.env.DRIVER_PROFILE_HIST_SPAN || '76', 10),
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DRIVER_AGGREGATE_CACHE_MS = Math.max(
  60_000,
  parseInt(process.env.DRIVER_AGGREGATE_CACHE_MS || String(4 * 60 * 60 * 1000), 10),
);
const driverAggregateCache = new Map();
const driverAggregateInflight = new Map();
let driverAggregateGlobalChain = Promise.resolve();

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
  'Monza Grand Prix': 'Italia',
};

const sanitizeDriverId = (id) => {
  const s = String(id || '').trim().toLowerCase();
  if (!/^[a-z0-9_]+$/.test(s)) {
    const err = new Error('Invalid driver id');
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

/** One race row for this driver (never assume Results[0] — some endpoints return full grids). */
function resultForDriver(race, driverId) {
  const results = race.Results ?? [];
  if (!results.length) return null;
  const hit = results.find((r) => r.Driver?.driverId === driverId);
  if (hit) return hit;
  return results.length === 1 ? results[0] : null;
}

async function fetchAllDriverResults(driverId) {
  const all = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const raw = await jolpicaClient.get(
      `/drivers/${driverId}/results.json?limit=${limit}&offset=${offset}`,
      PROFILE_JOLPICA,
    );
    const total = parseInt(raw?.MRData?.total ?? '0', 10);
    const races = raw?.MRData?.RaceTable?.Races ?? [];
    if (races.length === 0) break;
    all.push(...races);
    // Jolpica caps page size (~100) even when limit=1000; advance by rows returned, not by requested limit.
    if (total > 0 && all.length >= total) break;
    offset += races.length;
  }
  return all;
}

async function mapPool(items, poolSize, fn) {
  const out = new Array(items.length);
  for (let i = 0; i < items.length; i += poolSize) {
    const slice = items.slice(i, i + poolSize);
    const chunk = await Promise.all(slice.map((item) => fn(item)));
    chunk.forEach((v, j) => {
      out[i + j] = v;
    });
  }
  return out;
}

/** Scheduled rounds + Ergast "current" season id from one request. */
async function fetchCurrentSeasonMeta() {
  try {
    const raw = await jolpicaClient.get('/current/races.json', PROFILE_JOLPICA);
    const races = raw?.MRData?.RaceTable?.Races ?? [];
    const season = parseInt(raw?.MRData?.RaceTable?.season ?? String(new Date().getUTCFullYear()), 10);
    return {
      rounds: races.length,
      season: Number.isFinite(season) ? season : new Date().getUTCFullYear(),
    };
  } catch {
    return { rounds: 0, season: new Date().getUTCFullYear() };
  }
}

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Driver standing row + how many rounds that table reflects (final = total rounds). */
async function fetchStandingForYear(year, driverId) {
  try {
    const raw = await jolpicaClient.get(`/${year}/driverStandings.json`, PROFILE_JOLPICA);
    const table = raw?.MRData?.StandingsTable;
    const lists = asArray(table?.StandingsLists);
    const listBlock = lists.length ? lists[lists.length - 1] : null;
    const list = asArray(listBlock?.DriverStandings);
    const standingsRound = parseInt(
      listBlock?.round ?? table?.round ?? '0',
      10,
    );
    const ds = list.find((d) => d.Driver?.driverId === driverId) ?? null;
    return { ds, standingsRound };
  } catch {
    return { ds: null, standingsRound: 0 };
  }
}

function dominantTeam(teamCounts) {
  let best = '';
  let n = 0;
  for (const [t, c] of Object.entries(teamCounts)) {
    if (c > n) {
      n = c;
      best = t;
    }
  }
  return best || '—';
}

function countFastestLaps(allRaces, driverId) {
  let n = 0;
  for (const race of allRaces) {
    const res = resultForDriver(race, driverId);
    if (!res) continue;
    if (res.FastestLap?.rank === '1') n += 1;
  }
  return n;
}

function parseResultRow(race, driverId) {
  const res = resultForDriver(race, driverId);
  if (!res) return null;
  const pos = parseInt(res.position, 10);
  const grid = parseInt(res.grid, 10);
  const pts = parseFloat(res.points) || 0;
  const laps = parseInt(res.laps, 10) || 0;
  const gap = res.Time?.time ?? res.status ?? '—';
  const fl = res.FastestLap?.rank === '1';
  return {
    round: parseInt(race.round, 10),
    gp: gpLabelEs(race.raceName),
    grid: Number.isFinite(grid) ? grid : 0,
    pos: Number.isFinite(pos) ? pos : 0,
    pts,
    gap,
    laps,
    fl,
    teamName: res.Constructor?.name ?? '',
  };
}

function aggregateBySeason(allRaces, driverId) {
  const by = {};
  for (const race of allRaces) {
    const y = race.season;
    const res = resultForDriver(race, driverId);
    if (!res) continue;
    if (!by[y]) {
      by[y] = {
        races: 0,
        wins: 0,
        podiums: 0,
        poles: 0,
        pointsSum: 0,
        teamHits: {},
      };
    }
    const row = by[y];
    row.races += 1;
    const p = parseInt(res.position, 10);
    if (p === 1) row.wins += 1;
    if (Number.isFinite(p) && p <= 3) row.podiums += 1;
    const g = parseInt(res.grid, 10);
    if (g === 1) row.poles += 1;
    row.pointsSum += parseFloat(res.points) || 0;
    const team = res.Constructor?.name ?? '';
    if (team) row.teamHits[team] = (row.teamHits[team] || 0) + 1;
  }
  return by;
}

function debutLabel(allRaces, driverId) {
  const sorted = [...allRaces].sort(
    (a, b) => parseInt(a.season, 10) - parseInt(b.season, 10) || parseInt(a.round, 10) - parseInt(b.round, 10),
  );
  for (const race of sorted) {
    const res = resultForDriver(race, driverId);
    if (!res) continue;
    return `${race.raceName} ${race.season}`;
  }
  return '—';
}

function driverYearSlots(seasonYear, span) {
  const slots = [];
  for (let y = seasonYear; y >= seasonYear - span; y -= 1) slots.push(y);
  return slots;
}

function yearsSliceForCareerPage(seasonYear, span, careerPage) {
  const slots = driverYearSlots(seasonYear, span);
  const n = slots.length;
  const pageSize = CAREER_HISTORY_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(n / pageSize));
  const p = Math.min(Math.max(1, careerPage), totalPages);
  const start = (p - 1) * pageSize;
  const end = Math.min(start + pageSize, n);
  return { years: slots.slice(start, end), totalYears: n, totalPages, page: p, pageSize };
}

async function fetchCurrentDriverStanding(driverId) {
  try {
    const raw = await jolpicaClient.get('/current/driverStandings.json', PROFILE_JOLPICA);
    const list = raw?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
    const ds = list.find((d) => d.Driver?.driverId === driverId);
    if (!ds) return null;
    return {
      pos: parseInt(ds.position, 10),
      points: parseFloat(ds.points),
      wins: parseInt(ds.wins ?? '0', 10),
      team: ds.Constructors?.[0]?.name ?? 'Unknown',
    };
  } catch {
    return null;
  }
}

async function fetchCurrentSeasonResultRows(driverId, seasonYear) {
  try {
    const raw = await jolpicaClient.get(
      `/current/drivers/${driverId}/results.json`,
      PROFILE_JOLPICA,
    );
    const races = raw?.MRData?.RaceTable?.Races ?? [];
    return races
      .map((r) => parseResultRow(r, driverId))
      .filter(Boolean)
      .sort((a, b) => a.round - b.round);
  } catch {
    return [];
  }
}

function buildCareerRowFromStanding(year, standingResult, calendarYear, officialCurrentRounds) {
  const { ds, standingsRound } = standingResult;
  if (!ds) return null;
  const pos = parseInt(ds.position, 10);
  const wins = parseInt(ds.wins ?? '0', 10);
  const pts = parseFloat(ds.points ?? '0');
  const totalRounds = year === calendarYear && officialCurrentRounds > 0 ? officialCurrentRounds : 0;
  const seasonComplete =
    year < calendarYear ||
    (year === calendarYear && totalRounds > 0 && standingsRound >= totalRounds);
  const titleWon = Number.isFinite(pos) && pos === 1 && seasonComplete;

  return {
    year,
    team: ds.Constructors?.[0]?.name ?? '—',
    races: 0,
    wins: Number.isFinite(wins) ? wins : 0,
    podiums: 0,
    poles: 0,
    pts: Number.isFinite(pts) ? pts : 0,
    pos: Number.isFinite(pos) && pos > 0 ? pos : null,
    seasonComplete,
    titleWon,
  };
}

function writeDriverAggregateCache(driverId, payload, partial = false) {
  driverAggregateCache.set(driverId, { ts: Date.now(), partial, ...payload });
}

function scheduleDriverAggregatePrefetch(driverId) {
  const hit = driverAggregateCache.get(driverId);
  if (hit && Date.now() - hit.ts < DRIVER_AGGREGATE_CACHE_MS && !hit.partial) return;
  if (driverAggregateInflight.has(driverId)) return;

  driverAggregateGlobalChain = driverAggregateGlobalChain
    .then(() => sleep(500))
    .then(() => startDriverAggregateJob(driverId))
    .catch(() => {});
}

function startDriverAggregateJob(driverId) {
  const hit = driverAggregateCache.get(driverId);
  if (hit && Date.now() - hit.ts < DRIVER_AGGREGATE_CACHE_MS && !hit.partial) {
    return Promise.resolve({
      stats: hit.stats,
      championships: hit.championships,
      debut: hit.debut,
      maxCareerPts: hit.maxCareerPts,
      partial: false,
    });
  }

  let inflight = driverAggregateInflight.get(driverId);
  if (inflight) return inflight;

  inflight = driverAggregateGlobalChain
    .then(() => buildFullDriverProfileFromJolpica(driverId, 1))
    .then((profile) => {
      const maxCareerPts = profile.careerHistoryPagination?.maxPts
        ?? (profile.careerHistory.length
          ? Math.max(1, ...profile.careerHistory.map((r) => r.pts))
          : 1);
      const payload = {
        stats: profile.stats,
        championships: profile.championships,
        debut: profile.debut,
        maxCareerPts,
      };
      writeDriverAggregateCache(driverId, payload, false);
      driverAggregateInflight.delete(driverId);
      return { ...payload, partial: false };
    })
    .catch((err) => {
      driverAggregateInflight.delete(driverId);
      const partial = driverAggregateCache.get(driverId);
      if (partial?.stats) {
        return {
          stats: partial.stats,
          championships: partial.championships,
          debut: partial.debut,
          maxCareerPts: partial.maxCareerPts,
          partial: true,
        };
      }
      throw err;
    });

  driverAggregateInflight.set(driverId, inflight);
  driverAggregateGlobalChain = inflight.catch(() => {});
  return inflight;
}

const DRIVER_AGGREGATES_HTTP_WAIT_MS = Math.max(
  5_000,
  parseInt(process.env.DRIVER_AGGREGATES_WAIT_MS || '22000', 10),
);

async function buildQuickLiveDriverAggregate(driverId) {
  const historical = getDriverHistoricalStats(driverId);
  if (!historical) return null;

  const [{ season }, standing] = await Promise.all([
    fetchCurrentSeasonMeta(),
    fetchCurrentDriverStanding(driverId),
  ]);

  const merged = mergeDriverHistoricalWithLive(historical, { standing, seasonYear: season });
  const hit = driverAggregateCache.get(driverId);

  return {
    stats: merged.stats,
    championships: merged.championships,
    debut: hit?.debut ?? historical.debut,
    maxCareerPts: hit?.maxCareerPts ?? merged.maxCareerPts,
    partial: true,
  };
}

export async function getDriverProfileAggregates(rawDriverId) {
  const driverId = sanitizeDriverId(rawDriverId);

  const hit = driverAggregateCache.get(driverId);
  if (hit && Date.now() - hit.ts < DRIVER_AGGREGATE_CACHE_MS && !hit.partial) {
    return {
      stats: hit.stats,
      championships: hit.championships,
      debut: hit.debut,
      maxCareerPts: hit.maxCareerPts,
      partial: false,
    };
  }

  if (!driverAggregateInflight.has(driverId)) {
    scheduleDriverAggregatePrefetch(driverId);
  }

  const quick = await buildQuickLiveDriverAggregate(driverId);
  if (quick) {
    const raced = await Promise.race([
      driverAggregateInflight.get(driverId) ?? startDriverAggregateJob(driverId),
      sleep(DRIVER_AGGREGATES_HTTP_WAIT_MS).then(() => null),
    ]);
    if (raced && !raced.partial) return raced;
    return quick;
  }

  const job = driverAggregateInflight.get(driverId) ?? startDriverAggregateJob(driverId);
  return job;
}

/** Cálculo completo vía Jolpica (pesado; resultados de toda la carrera). */
async function buildFullDriverProfileFromJolpica(rawDriverId, opts = {}) {
  const careerPage = Math.max(1, parseInt(String(opts.careerPage ?? '1'), 10) || 1);
  const driverId = sanitizeDriverId(rawDriverId);
  /** Calendar year (UTC): seasons strictly before this are treated as final in Ergast. */
  const calendarYear = new Date().getUTCFullYear();

  const [driverRaw, allRaces] = await Promise.all([
    jolpicaClient.get(`/drivers/${driverId}.json`, PROFILE_JOLPICA).catch(() => null),
    fetchAllDriverResults(driverId),
  ]);
  const d0 = driverRaw?.MRData?.DriverTable?.Drivers?.[0];
  if (!d0) {
    const err = new Error('Driver not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const bySeasonAgg = aggregateBySeason(allRaces, driverId);
  const years = [...new Set(allRaces.map((r) => r.season))]
    .map((y) => parseInt(y, 10))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);

  const maxRoundByYear = new Map();
  for (const race of allRaces) {
    const y = parseInt(race.season, 10);
    if (!Number.isFinite(y)) continue;
    const rr = parseInt(race.round, 10);
    if (!Number.isFinite(rr)) continue;
    const cur = maxRoundByYear.get(y) ?? 0;
    if (rr > cur) maxRoundByYear.set(y, rr);
  }

  const needsCurrentCalendar = years.includes(calendarYear);
  const [standingsList, currentMeta] = await Promise.all([
    mapPool(years, STANDINGS_POOL, (year) => fetchStandingForYear(year, driverId)),
    needsCurrentCalendar ? fetchCurrentSeasonMeta() : Promise.resolve({ rounds: 0, season: calendarYear }),
  ]);
  const officialCurrentRounds = currentMeta.rounds;
  const f1SeasonYear = needsCurrentCalendar ? currentMeta.season : calendarYear;

  const currentRaces = allRaces.filter((r) => r.season === String(f1SeasonYear));
  const currentSeasonRows = currentRaces
    .map((r) => parseResultRow(r, driverId))
    .filter(Boolean)
    .sort((a, b) => a.round - b.round);

  const winsCurrentSeason = currentSeasonRows.filter((r) => r.pos === 1).length;

  const totalRoundsByYear = new Map(
    years.map((y) => {
      const official = y === calendarYear && officialCurrentRounds > 0 ? officialCurrentRounds : 0;
      const fallback = maxRoundByYear.get(y) ?? 0;
      return [y, official > 0 ? official : fallback];
    }),
  );

  const careerHistory = years.map((year, idx) => {
    const yKey = String(year);
    const { ds, standingsRound } = standingsList[idx];
    const agg = bySeasonAgg[yKey] ?? {
      races: 0,
      wins: 0,
      podiums: 0,
      poles: 0,
      pointsSum: 0,
      teamHits: {},
    };
    const team = ds?.Constructors?.[0]?.name ?? dominantTeam(agg.teamHits);
    const wins = ds ? parseInt(ds.wins, 10) : agg.wins;
    const pts = ds ? parseFloat(ds.points) : agg.pointsSum;
    const pos = ds ? parseInt(ds.position, 10) : 0;
    const totalRounds = totalRoundsByYear.get(year) ?? 0;
    // Past years: published driverStandings are final — do not require round === calendar length
    // (Jolpica/Ergast can disagree on sprint weekends / cancelled races).
    const seasonComplete =
      year < calendarYear ||
      (year === calendarYear && totalRounds > 0 && standingsRound >= totalRounds);
    const titleWon = ds && pos === 1 && seasonComplete;

    return {
      year,
      team: team || '—',
      races: agg.races,
      wins: Number.isFinite(wins) ? wins : agg.wins,
      podiums: agg.podiums,
      poles: agg.poles,
      pts: Number.isFinite(pts) ? pts : agg.pointsSum,
      pos: Number.isFinite(pos) && pos > 0 ? pos : null,
      seasonComplete,
      titleWon,
    };
  });

  const championships = careerHistory.filter((r) => r.titleWon).length;

  let totalWins = 0;
  let totalPodiums = 0;
  let totalPoles = 0;
  let totalPoints = 0;
  for (const race of allRaces) {
    const res = resultForDriver(race, driverId);
    if (!res) continue;
    const p = parseInt(res.position, 10);
    if (p === 1) totalWins += 1;
    if (Number.isFinite(p) && p <= 3) totalPodiums += 1;
    if (parseInt(res.grid, 10) === 1) totalPoles += 1;
    totalPoints += parseFloat(res.points) || 0;
  }

  const racesTotal = allRaces.filter((r) => resultForDriver(r, driverId)).length;
  const fastestLaps = countFastestLaps(allRaces, driverId);
  const debut = debutLabel(allRaces, driverId);

  const permanentNumber = d0.permanentNumber != null && d0.permanentNumber !== ''
    ? parseInt(String(d0.permanentNumber), 10)
    : null;

  const currentSeasonYear = Number.isFinite(f1SeasonYear) ? f1SeasonYear : calendarYear;

  const { items: careerHistoryPage, careerHistoryPagination } = paginateCareerHistoryByRecentPage(
    careerHistory,
    careerPage,
    (r) => r.pts,
  );

  return {
    source: 'external',
    driverId: d0.driverId,
    givenName: d0.givenName,
    familyName: d0.familyName,
    code: d0.code ?? '',
    number: Number.isFinite(permanentNumber) ? permanentNumber : null,
    dateOfBirth: d0.dateOfBirth ?? null,
    nationality: d0.nationality ?? '',
    championships,
    debut,
    currentSeasonYear: Number.isFinite(currentSeasonYear) ? currentSeasonYear : new Date().getFullYear(),
    stats: {
      wins: totalWins,
      podiums: totalPodiums,
      poles: totalPoles,
      fastestLaps,
      races: racesTotal,
      points: Math.round(totalPoints * 10) / 10,
      winsCurrentSeason,
    },
    currentSeason: currentSeasonRows,
    careerHistory: careerHistoryPage,
    careerHistoryPagination,
  };
}

/**
 * Ficha rápida: stats históricos locales + temporada actual; agregados completos en background.
 */
export const getDriverProfile = async (rawDriverId, opts = {}) => {
  const careerPage = Math.max(1, parseInt(String(opts.careerPage ?? '1'), 10) || 1);
  const driverId = sanitizeDriverId(rawDriverId);
  const calendarYear = new Date().getUTCFullYear();

  const driverRaw = await jolpicaClient
    .get(`/drivers/${driverId}.json`, PROFILE_JOLPICA)
    .catch(() => null);
  const d0 = driverRaw?.MRData?.DriverTable?.Drivers?.[0];
  if (!d0) {
    const err = new Error('Driver not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const currentMeta = await fetchCurrentSeasonMeta();
  const f1SeasonYear = currentMeta.season;
  const slice = yearsSliceForCareerPage(f1SeasonYear, DRIVER_HIST_SPAN, careerPage);

  const [standing, currentSeasonRows, standingsList] = await Promise.all([
    fetchCurrentDriverStanding(driverId),
    fetchCurrentSeasonResultRows(driverId, f1SeasonYear),
    mapPool(slice.years, PROFILE_STANDINGS_POOL, (year) =>
      fetchStandingForYear(year, driverId),
    ),
  ]);

  const careerHistory = slice.years
    .map((year, idx) =>
      buildCareerRowFromStanding(
        year,
        standingsList[idx],
        calendarYear,
        currentMeta.rounds,
      ),
    )
    .filter(Boolean);

  const maxPtsPage = careerHistory.length
    ? Math.max(1, ...careerHistory.map((r) => r.pts))
    : 1;

  let careerHistoryPagination = null;
  if (slice.totalYears > CAREER_HISTORY_PAGE_SIZE) {
    careerHistoryPagination = {
      page: slice.page,
      pageSize: slice.pageSize,
      totalYears: slice.totalYears,
      totalPages: slice.totalPages,
      maxPts: maxPtsPage,
    };
  }

  const historical = getDriverHistoricalStats(driverId);
  const agg = driverAggregateCache.get(driverId);
  const aggFresh = agg && Date.now() - agg.ts < DRIVER_AGGREGATE_CACHE_MS && !agg.partial;
  const currentYearRow = careerHistory.find((r) => r.year === f1SeasonYear) ?? null;

  let championships;
  let stats;
  let debut;
  let aggregatesPending = false;
  let statsSource = 'local';

  if (aggFresh) {
    championships = agg.championships;
    stats = agg.stats;
    debut = agg.debut;
    statsSource = 'api';
    if (careerHistoryPagination) {
      careerHistoryPagination = { ...careerHistoryPagination, maxPts: agg.maxCareerPts };
    }
  } else if (historical) {
    const merged = mergeDriverHistoricalWithLive(historical, {
      standing,
      seasonYear: f1SeasonYear,
      currentYearRow,
    });
    championships = merged.championships;
    stats = merged.stats;
    debut = historical.debut;
    statsSource = standing ? 'live' : 'local';
    aggregatesPending = true;
    if (careerHistoryPagination) {
      careerHistoryPagination = {
        ...careerHistoryPagination,
        maxPts: historical.maxCareerPts,
      };
    } else {
      careerHistoryPagination = null;
    }
    scheduleDriverAggregatePrefetch(driverId);
  } else {
    aggregatesPending = true;
    championships = 0;
    stats = {
      wins: 0,
      podiums: 0,
      poles: 0,
      fastestLaps: 0,
      races: 0,
      points: 0,
      winsCurrentSeason: standing?.wins ?? 0,
    };
    debut = '—';
    scheduleDriverAggregatePrefetch(driverId);
  }

  const permanentNumber =
    d0.permanentNumber != null && d0.permanentNumber !== ''
      ? parseInt(String(d0.permanentNumber), 10)
      : null;

  return {
    source: 'external',
    driverId: d0.driverId,
    givenName: d0.givenName,
    familyName: d0.familyName,
    code: d0.code ?? '',
    number: Number.isFinite(permanentNumber) ? permanentNumber : null,
    dateOfBirth: d0.dateOfBirth ?? null,
    nationality: d0.nationality ?? '',
    championships,
    debut,
    currentSeasonYear: f1SeasonYear,
    stats,
    currentSeason: currentSeasonRows,
    careerHistory,
    careerHistoryPagination,
    aggregatesPending,
    statsSource,
  };
};
