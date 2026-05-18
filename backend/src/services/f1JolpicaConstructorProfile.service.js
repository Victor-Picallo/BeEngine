import { jolpicaClient } from '../external/jolpica/jolpica.client.js';
import { paginateCareerHistoryByRecentPage } from '../utils/careerPagination.js';

const PROFILE_JOLPICA = { timeoutMs: 10_000 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Respuesta JSON ya montada; TTL corto para no servir datos viejos pero repetir la misma ficha sin recomputar.
 * Ajustable: CONSTRUCTOR_PROFILE_SHMEM_CACHE_MS (ms), CONSTRUCTOR_PROFILE_SHMEM_CACHE_MAX (entradas).
 */
const PROFILE_SHMEM_CACHE_MS = Math.max(
  15_000,
  parseInt(process.env.CONSTRUCTOR_PROFILE_SHMEM_CACHE_MS || '90000', 10),
);
const PROFILE_SHMEM_CACHE_MAX = Math.max(
  8,
  parseInt(process.env.CONSTRUCTOR_PROFILE_SHMEM_CACHE_MAX || '48', 10),
);
const profileShmemCache = new Map();

/** Peticiones de historial en paralelo (el cliente Jolpica limita concurrencia global). */
const HISTORY_POOL = 10;
/** Tras la oleada inicial, reintenta años “hueco” (máx. por petición, p. ej. 2018–2020). */
const MAX_GAP_REFETCH_YEARS = 12;
const GAP_REFETCH_ATTEMPTS = 3;
const GAP_MS_BETWEEN_YEARS = 55;
/**
 * Años hacia atrás desde la temporada actual. Menos años = menos llamadas a Jolpica en la 1ª carga.
 * Sobreescribe con CONSTRUCTOR_PROFILE_HIST_SPAN si necesitas más historia.
 */
const HISTORY_YEAR_SPAN = Math.max(
  30,
  parseInt(process.env.CONSTRUCTOR_PROFILE_HIST_SPAN || '58', 10),
);
/** Temporadas ya cerradas: la tabla de clasificación no cambia → caché HTTP larga en cliente Jolpica. */
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
      // MRData.total en este endpoint no es el nº de nodos Race; paginar hasta alcanzarlo
      // repite la misma carrera en offsets sucesivos (solape).
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

async function mapPool(items, poolSize, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += poolSize) {
    const slice = items.slice(i, i + poolSize);
    const chunk = await Promise.all(slice.map((item) => fn(item)));
    out.push(...chunk);
  }
  return out;
}

function pickConstructorStandingRow(list, constructorId) {
  if (!Array.isArray(list) || !list.length) return null;
  const id = String(constructorId || '').toLowerCase();
  const hit = list.find((cs) => String(cs.Constructor?.constructorId || '').toLowerCase() === id);
  if (hit) return hit;
  return list.length === 1 ? list[0] : null;
}

function parseStandingRow(year, raw, constructorId) {
  const table = raw?.MRData?.StandingsTable;
  const lists = table?.StandingsLists;
  const sl =
    (Array.isArray(lists) && lists.length ? lists[lists.length - 1] : null) ??
    raw?.MRData?.StandingsTable?.StandingsLists?.[0] ??
    {};
  const list = sl.ConstructorStandings ?? sl.constructorStandings ?? [];
  const row = pickConstructorStandingRow(list, constructorId);
  if (!row) return null;
  const standingsRound = parseInt(sl?.round ?? table?.round ?? '0', 10);
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

/**
 * @param {{ attempts?: number }} [opts]
 */
async function fetchConstructorStandingForYear(year, constructorId, seasonYear, opts = {}) {
  const attempts = Number.isFinite(opts.attempts) && opts.attempts > 0 ? opts.attempts : 3;
  const hist = year < seasonYear;
  const jopts = hist
    ? {
        ...PROFILE_JOLPICA,
        freshTtlMs: HIST_STANDING_CACHE_FRESH_MS,
        staleTtlMs: HIST_STANDING_CACHE_STALE_MS,
      }
    : PROFILE_JOLPICA;

  for (let a = 1; a <= attempts; a += 1) {
    try {
      const raw = await jolpicaClient.get(
        `/${year}/constructors/${constructorId}/constructorStandings.json`,
        jopts,
      );
      return parseStandingRow(year, raw, constructorId);
    } catch {
      if (a < attempts) await sleep(280 * a);
    }
  }
  return null;
}

/** Años entre dos temporadas ya recuperadas (huecos por errores transitorios de red/API). */
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

function applyConstructorCareerPage(payload, careerPage) {
  const { items, careerHistoryPagination } = paginateCareerHistoryByRecentPage(
    payload.careerHistory,
    careerPage,
    (r) => r.pts,
  );
  return { ...payload, careerHistory: items, careerHistoryPagination };
}

function buildBio(c, standing, seasonYear, drivers, careerHistory) {
  const nat = c.nationality || '—';
  const names = drivers.map((d) => `${d.givenName} ${d.familyName}`).filter(Boolean);
  const pair = names.length >= 2 ? `${names[0]} y ${names[1]}` : names[0] || 'sus pilotos';
  const champs = careerHistory.filter((h) => h.titleWon).length;
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

export async function getConstructorProfile(rawConstructorId, opts = {}) {
  const careerPage = Math.max(1, parseInt(String(opts.careerPage ?? '1'), 10) || 1);
  const constructorId = sanitizeConstructorId(rawConstructorId);

  const mem = profileShmemCache.get(constructorId);
  if (mem && Date.now() - mem.ts < PROFILE_SHMEM_CACHE_MS) {
    return applyConstructorCareerPage(mem.payload, careerPage);
  }

  const [{ seasonYear, scheduledRounds }, [c, drivers, standing, races]] = await Promise.all([
    fetchCurrentSeasonSchedule(),
    Promise.all([
      fetchConstructorRow(constructorId),
      fetchCurrentDrivers(constructorId),
      fetchCurrentStandingRow(constructorId),
      fetchAllCurrentConstructorResults(constructorId),
    ]),
  ]);

  const currentSeason = buildCurrentSeasonRaces(races);

  const years = [];
  for (let y = seasonYear; y >= seasonYear - HISTORY_YEAR_SPAN; y -= 1) years.push(y);

  const historyParts = await mapPool(years, HISTORY_POOL, (year) =>
    fetchConstructorStandingForYear(year, constructorId, seasonYear),
  );
  const present = historyParts.filter(Boolean);
  const gapYears = interiorGapYears(present, seasonYear, MAX_GAP_REFETCH_YEARS);
  for (const y of gapYears) {
    await sleep(GAP_MS_BETWEEN_YEARS);
    const row = await fetchConstructorStandingForYear(y, constructorId, seasonYear, {
      attempts: GAP_REFETCH_ATTEMPTS,
    });
    if (row) present.push(row);
  }
  const byYear = new Map();
  for (const h of present) {
    byYear.set(h.year, h);
  }
  const merged = [...byYear.values()].sort((a, b) => a.year - b.year);

  const careerHistory = merged.map((h) => {
    const seasonCompleteRow =
      h.year < seasonYear ||
      (h.year === seasonYear && scheduledRounds > 0 && h.standingsRound >= scheduledRounds);
    return {
      ...h,
      titleWon: h.pos === 1 && seasonCompleteRow,
    };
  });

  const championships = careerHistory.filter((h) => h.titleWon).length;
  const totalWins = careerHistory.reduce((s, h) => s + h.wins, 0);

  const bioText = buildBio(c, standing, seasonYear, drivers, careerHistory);

  const payload = {
    source: 'external',
    constructorId: c.constructorId,
    name: c.name,
    nationality: c.nationality,
    wikiUrl: c.wikiUrl,
    currentSeasonYear: seasonYear,
    standing,
    stats: {
      championships,
      totalWins,
      totalPodiums: careerHistory.reduce((s, h) => s + h.podiums, 0),
      totalPoles: careerHistory.reduce((s, h) => s + h.poles, 0),
    },
    drivers,
    currentSeason,
    careerHistory,
    bioText,
  };

  if (profileShmemCache.size >= PROFILE_SHMEM_CACHE_MAX) {
    const firstKey = profileShmemCache.keys().next().value;
    if (firstKey != null) profileShmemCache.delete(firstKey);
  }
  profileShmemCache.set(constructorId, { ts: Date.now(), payload });

  return applyConstructorCareerPage(payload, careerPage);
}
