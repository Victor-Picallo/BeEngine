import {
  pulseliveClient,
  MOTOGP_CATEGORY_UUID,
} from '../../external/motogp/pulselive.client.js';
import {
  getManufacturerHistorical,
  isManufacturerChampionYear,
} from '../../data/motogp/motogpManufacturerHistorical.js';
import { getTeamHistorical } from '../../data/motogp/motogpTeamHistorical.js';
import { getMotogpTeamProfileDef, teamSlugMatchesProfile } from '../../data/motogp/motogpTeamProfiles.js';
import { CAREER_HISTORY_PAGE_SIZE } from '../../utils/careerPagination.js';

const asList = (raw) => (Array.isArray(raw) ? raw : raw?.value ?? []);

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const HISTORY_YEAR_SPAN = Math.max(
  30,
  parseInt(process.env.MOTOGP_PROFILE_HIST_SPAN || '78', 10),
);

let seasonsCache = null;
let seasonsCacheTs = 0;
const SEASONS_CACHE_MS = 6 * 60 * 60_000;

const getSeasons = async () => {
  const now = Date.now();
  if (seasonsCache && now - seasonsCacheTs < SEASONS_CACHE_MS) {
    return seasonsCache;
  }
  const raw = await pulseliveClient.get('/results/seasons', { freshTtlMs: SEASONS_CACHE_MS });
  const list = asList(raw)
    .filter((s) => Number.isFinite(s.year))
    .sort((a, b) => a.year - b.year);
  seasonsCache = list;
  seasonsCacheTs = now;
  return list;
};

const rankManufacturers = (classification) => {
  const byMfr = new Map();
  for (const r of classification) {
    const mfr = slugify(r.constructor?.name);
    if (!mfr) continue;
    const cur = byMfr.get(mfr) ?? { pts: 0, wins: 0, podiums: 0 };
    cur.pts += Number(r.points) || 0;
    cur.wins += Number(r.race_wins) || 0;
    cur.podiums += Number(r.podiums) || 0;
    byMfr.set(mfr, cur);
  }
  return [...byMfr.entries()]
    .sort((a, b) => b[1].pts - a[1].pts)
    .map(([mfr, data], i) => ({ mfr, ...data, pos: i + 1 }));
};

const pickLeadFactoryTeamName = (classification, manufacturerSlug) => {
  let best = null;
  for (const r of classification) {
    if (slugify(r.constructor?.name) !== manufacturerSlug) continue;
    const pts = Number(r.points) || 0;
    const teamName = r.team?.name ?? r.constructor?.name ?? '—';
    if (!best || pts > best.pts) best = { teamName, pts };
  }
  return best?.teamName ?? null;
};

const aggregateTeamFromClassification = (classification, profile) => {
  const byTeam = new Map();
  for (const r of classification) {
    const teamName = r.team?.name ?? r.constructor?.name;
    if (!teamName) continue;
    const key = slugify(teamName);
    const cur = byTeam.get(key) ?? { teamName, points: 0, wins: 0, podiums: 0 };
    cur.points += Number(r.points) || 0;
    cur.wins += Number(r.race_wins) || 0;
    cur.podiums += Number(r.podiums) || 0;
    byTeam.set(key, cur);
  }
  const sorted = [...byTeam.entries()].sort((a, b) => b[1].points - a[1].points);
  for (let i = 0; i < sorted.length; i++) {
    const [, data] = sorted[i];
    if (teamSlugMatchesProfile(slugify(data.teamName), profile)) {
      return {
        teamName: data.teamName,
        points: data.points,
        wins: data.wins,
        podiums: data.podiums,
        pos: i + 1,
      };
    }
  }
  return null;
};

const yearsSliceForCareerPage = (seasonYear, fromYear, careerPage) => {
  const end = seasonYear;
  const start = Math.max(1949, end - HISTORY_YEAR_SPAN + 1, fromYear);
  const years = [];
  for (let y = start; y <= end; y++) years.push(y);
  const n = years.length;
  const pageSize = CAREER_HISTORY_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(n / pageSize));
  const p = Math.min(Math.max(1, careerPage), totalPages);
  const sliceStart = Math.max(0, n - p * pageSize);
  const sliceEnd = n - (p - 1) * pageSize;
  return {
    years: years.slice(sliceStart, sliceEnd),
    totalYears: n,
    totalPages,
    page: p,
  };
};

const fetchSeasonRowManufacturer = async (season, manufacturerSlug, currentSeasonYear) => {
  if (!season?.id) return null;
  const raw = await pulseliveClient.get(
    `/results/standings?seasonUuid=${season.id}&categoryUuid=${MOTOGP_CATEGORY_UUID}`,
    { freshTtlMs: 60 * 60_000 },
  );
  const classification = raw?.classification ?? [];
  if (!classification.length) return null;

  const ranked = rankManufacturers(classification);
  const row = ranked.find((r) => r.mfr === manufacturerSlug);
  if (!row) return null;

  const complete = season.year < currentSeasonYear;
  const titleWon = complete && isManufacturerChampionYear(manufacturerSlug, season.year);

  return {
    year: season.year,
    name: pickLeadFactoryTeamName(classification, manufacturerSlug) ?? manufacturerSlug,
    races: null,
    wins: row.wins,
    podiums: row.podiums,
    poles: 0,
    pts: row.pts,
    pos: row.pos,
    seasonComplete: complete,
    titleWon,
  };
};

const fetchSeasonRowTeam = async (season, profile, currentSeasonYear) => {
  if (!season?.id) return null;
  const raw = await pulseliveClient.get(
    `/results/standings?seasonUuid=${season.id}&categoryUuid=${MOTOGP_CATEGORY_UUID}`,
    { freshTtlMs: 60 * 60_000 },
  );
  const classification = raw?.classification ?? [];
  const row = aggregateTeamFromClassification(classification, profile);
  if (!row) return null;
  const complete = season.year < currentSeasonYear;
  return {
    year: season.year,
    name: row.teamName,
    races: null,
    wins: row.wins,
    podiums: row.podiums,
    poles: 0,
    pts: row.points,
    pos: row.pos,
    seasonComplete: complete,
    titleWon: false,
  };
};

/**
 * Historial paginado (como F1): página 1 = bloque más reciente.
 */
export const buildTeamCareerHistory = async (
  constructorId,
  currentSeasonYear,
  careerPage = 1,
) => {
  const profile = getMotogpTeamProfileDef(constructorId);
  if (!profile) return { items: [], careerHistoryPagination: null };

  const seasons = await getSeasons();
  const seasonByYear = new Map(seasons.map((s) => [s.year, s]));
  const page = Math.max(1, parseInt(String(careerPage), 10) || 1);

  if (profile.manufacturerSlug) {
    const fromYear = profile.historyFromYear ?? 1949;
    const slice = yearsSliceForCareerPage(currentSeasonYear, fromYear, page);
    const rows = [];
    for (const year of slice.years) {
      const season = seasonByYear.get(year);
      if (!season) continue;
      try {
        const row = await fetchSeasonRowManufacturer(
          season,
          profile.manufacturerSlug,
          currentSeasonYear,
        );
        if (row) rows.push(row);
      } catch {
        /* sin datos */
      }
    }
    const hist = getManufacturerHistorical(profile.manufacturerSlug);
    const maxPts = Math.max(
      hist?.maxCareerPts ?? 1,
      ...rows.map((r) => r.pts),
      1,
    );
    if (slice.totalYears <= CAREER_HISTORY_PAGE_SIZE) {
      return { items: rows.sort((a, b) => b.year - a.year), careerHistoryPagination: null };
    }
    return {
      items: rows.sort((a, b) => b.year - a.year),
      careerHistoryPagination: {
        page: slice.page,
        pageSize: CAREER_HISTORY_PAGE_SIZE,
        totalYears: slice.totalYears,
        totalPages: slice.totalPages,
        maxPts,
      },
    };
  }

  const fromYear = profile.debutYear ?? 2000;
  const slice = yearsSliceForCareerPage(currentSeasonYear, fromYear, page);
  const rows = [];
  for (const year of slice.years) {
    const season = seasonByYear.get(year);
    if (!season) continue;
    try {
      const row = await fetchSeasonRowTeam(season, profile, currentSeasonYear);
      if (row) rows.push(row);
    } catch {
      /* sin datos */
    }
  }
  const sorted = rows.sort((a, b) => b.year - a.year);
  const maxPts = Math.max(...sorted.map((r) => r.pts), 1);
  if (slice.totalYears <= CAREER_HISTORY_PAGE_SIZE) {
    return { items: sorted, careerHistoryPagination: null };
  }
  return {
    items: sorted,
    careerHistoryPagination: {
      page: slice.page,
      pageSize: CAREER_HISTORY_PAGE_SIZE,
      totalYears: slice.totalYears,
      totalPages: slice.totalPages,
      maxPts,
    },
  };
};

const sortYearsDesc = (years) => [...years].sort((a, b) => b - a);

export const statsFromCareerHistory = (careerHistory, profile, lifetime = null) => {
  const mfr = profile?.manufacturerSlug
    ? getManufacturerHistorical(profile.manufacturerSlug)
    : null;

  if (mfr) {
    const liveWins = careerHistory.reduce((s, h) => s + (h.wins ?? 0), 0);
    const livePodiums = careerHistory.reduce((s, h) => s + (h.podiums ?? 0), 0);
    return {
      championships: mfr.championships,
      championshipYears: sortYearsDesc(mfr.championshipYears),
      totalWins: Math.max(mfr.totalWins, liveWins, lifetime?.totalWins ?? 0),
      totalPodiums: Math.max(mfr.totalPodiums, livePodiums, lifetime?.totalPodiums ?? 0),
      totalPoles: mfr.totalPoles,
    };
  }

  const curated = getTeamHistorical(profile?.constructorId);
  const fromCareer = {
    championships: 0,
    totalWins: careerHistory.reduce((s, h) => s + (h.wins ?? 0), 0),
    totalPodiums: careerHistory.reduce((s, h) => s + (h.podiums ?? 0), 0),
    totalPoles: careerHistory.reduce((s, h) => s + (h.poles ?? 0), 0),
  };
  const fromLifetime = lifetime ?? {};
  return {
    championships: 0,
    championshipYears: [],
    totalWins: Math.max(
      curated?.totalWins ?? 0,
      fromCareer.totalWins,
      fromLifetime.totalWins ?? 0,
    ),
    totalPodiums: Math.max(
      curated?.totalPodiums ?? 0,
      fromCareer.totalPodiums,
      fromLifetime.totalPodiums ?? 0,
    ),
    totalPoles: Math.max(
      curated?.totalPoles ?? 0,
      fromCareer.totalPoles,
      fromLifetime.totalPoles ?? 0,
    ),
  };
};

const LIFETIME_CACHE_MS = 6 * 60 * 60_000;
/** @type {Map<string, { ts: number, data: object } | { promise: Promise<object> }>} */
const lifetimeStatsCache = new Map();

const POOL = 4;

const mapPool = async (items, fn) => {
  const out = [];
  for (let i = 0; i < items.length; i += POOL) {
    const chunk = items.slice(i, i + POOL);
    const rows = await Promise.all(chunk.map((item) => fn(item).catch(() => null)));
    out.push(...rows.filter(Boolean));
  }
  return out;
};

/** Suma victorias/podios reales del equipo en todas las temporadas Pulse (satélites). */
export const buildTeamLifetimeStats = async (profile, currentSeasonYear) => {
  if (!profile || profile.manufacturerSlug) return null;

  const key = profile.constructorId;
  const hit = lifetimeStatsCache.get(key);
  if (hit?.data && Date.now() - hit.ts < LIFETIME_CACHE_MS) return hit.data;
  if (hit?.promise) return hit.promise;

  const promise = (async () => {
    const seasons = await getSeasons();
    const seasonByYear = new Map(seasons.map((s) => [s.year, s]));
    const fromYear = profile.debutYear ?? 2002;
    const years = [];
    for (let y = fromYear; y <= currentSeasonYear; y++) {
      if (seasonByYear.has(y)) years.push(seasonByYear.get(y));
    }

    const rows = await mapPool(years, (season) =>
      fetchSeasonRowTeam(season, profile, currentSeasonYear),
    );

    const data = {
      championships: 0,
      totalWins: rows.reduce((s, r) => s + (r.wins ?? 0), 0),
      totalPodiums: rows.reduce((s, r) => s + (r.podiums ?? 0), 0),
      totalPoles: rows.reduce((s, r) => s + (r.poles ?? 0), 0),
      maxCareerPts: Math.max(...rows.map((r) => r.pts), 1),
    };

    lifetimeStatsCache.set(key, { ts: Date.now(), data });
    return data;
  })();

  lifetimeStatsCache.set(key, { promise });
  try {
    return await promise;
  } catch (err) {
    lifetimeStatsCache.delete(key);
    throw err;
  }
};
