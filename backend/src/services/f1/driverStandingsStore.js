import { jolpicaClient } from '../../external/jolpica/jolpica.client.js';
import { F1_DRIVERS_GRID_2026 } from '../../data/f1/f1DriversGrid2026.js';

const STANDINGS_FRESH_MS = Math.max(
  60_000,
  parseInt(process.env.DRIVER_STANDINGS_CACHE_MS || String(5 * 60 * 1000), 10),
);
const REFRESH_COOLDOWN_MS = 15_000;

let cache = null;
let refreshInflight = null;
let lastRefreshAttempt = 0;

const normName = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

function normalizeDriverStandings(raw) {
  const list = raw?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
  return list.map((ds) => ({
    pos: parseInt(ds.position, 10),
    driver: `${ds.Driver.givenName} ${ds.Driver.familyName}`.trim(),
    driverId: ds.Driver?.driverId ?? '',
    team: ds.Constructors?.[0]?.name ?? 'Unknown',
    points: parseFloat(ds.points),
    wins: parseInt(ds.wins ?? '0', 10),
    nationality: ds.Driver.nationality,
  }));
}

function normalizeCurrentSeasonDrivers(raw) {
  const drivers = raw?.MRData?.DriverTable?.Drivers ?? [];
  return drivers.map((d) => ({
    driverId: d.driverId,
    fullName: `${d.givenName} ${d.familyName}`.trim(),
  }));
}

function enrichDriverIds(rows, seasonDrivers) {
  if (!seasonDrivers.length) return rows;
  return rows.map((row) => {
    const id = (row.driverId ?? '').trim();
    if (id && id !== 'unknown') return row;
    const jn = normName(row.driver);
    const byName = seasonDrivers.find((s) => normName(s.fullName) === jn);
    if (byName?.driverId) return { ...row, driverId: byName.driverId };
    return row;
  });
}

function overlayByDriverId(liveRows) {
  const map = new Map();
  for (const row of liveRows) {
    const id = (row.driverId || '').trim().toLowerCase();
    if (id) map.set(id, row);
    const nameKey = normName(row.driver);
    if (nameKey) map.set(`name:${nameKey}`, row);
  }
  return map;
}

function matchLiveRow(live, gridEntry) {
  const byId = live.get(gridEntry.driverId);
  if (byId) return byId;
  return live.get(`name:${normName(gridEntry.driver)}`);
}

/**
 * Listado inmediato de pilotos (sin bloquear en Jolpica).
 */
export function buildDriverStandingsFromGrid() {
  const live = cache?.items?.length ? overlayByDriverId(cache.items) : null;
  const hasLive = Boolean(live?.size);

  let items = F1_DRIVERS_GRID_2026.map((g) => {
    const hit = live ? matchLiveRow(live, g) : null;
    if (hit) {
      return {
        pos: hit.pos,
        driver: hit.driver || g.driver,
        driverId: g.driverId,
        team: hit.team || g.team,
        points: hit.points,
        wins: hit.wins,
        nationality: hit.nationality || g.nationality,
      };
    }
    return {
      pos: g.gridOrder,
      driver: g.driver,
      driverId: g.driverId,
      team: g.team,
      points: 0,
      wins: 0,
      nationality: g.nationality,
    };
  });

  if (hasLive) {
    items = items.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.driver.localeCompare(b.driver);
    });
    items = items.map((row, i) => ({ ...row, pos: i + 1 }));
  }

  let source = 'local';
  if (hasLive) {
    const age = Date.now() - (cache?.ts ?? 0);
    source = age <= STANDINGS_FRESH_MS ? 'live' : 'cached';
  }

  return { source, items };
}

async function fetchLiveDriverStandings() {
  const [rawStand, rawSeasonDrivers] = await Promise.all([
    jolpicaClient.get('/current/driverStandings.json', { timeoutMs: 12_000 }),
    jolpicaClient.get('/current/drivers.json', { timeoutMs: 12_000 }).catch(() => null),
  ]);
  let items = normalizeDriverStandings(rawStand);
  if (rawSeasonDrivers) {
    items = enrichDriverIds(items, normalizeCurrentSeasonDrivers(rawSeasonDrivers));
  }
  return items;
}

export function scheduleDriverStandingsRefresh() {
  const now = Date.now();
  if (refreshInflight) return refreshInflight;
  if (now - lastRefreshAttempt < REFRESH_COOLDOWN_MS) return null;

  lastRefreshAttempt = now;
  refreshInflight = fetchLiveDriverStandings()
    .then((items) => {
      cache = { ts: Date.now(), items };
      return items;
    })
    .catch(() => cache?.items ?? null)
    .finally(() => {
      refreshInflight = null;
    });

  return refreshInflight;
}

export function getDriverStandingsResponse() {
  const built = buildDriverStandingsFromGrid();
  const age = cache?.ts ? Date.now() - cache.ts : Infinity;
  const needsRefresh = !cache || age > STANDINGS_FRESH_MS;

  if (needsRefresh) {
    scheduleDriverStandingsRefresh();
  }

  return built;
}

export async function warmDriverStandingsCache() {
  if (cache?.items?.length) return cache.items;
  try {
    const items = await fetchLiveDriverStandings();
    cache = { ts: Date.now(), items };
    return items;
  } catch {
    return null;
  }
}
