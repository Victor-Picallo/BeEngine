import { jolpicaClient } from '../../external/jolpica/jolpica.client.js';
import { F1_CONSTRUCTORS_GRID_2026 } from '../../data/f1/f1ConstructorsGrid2026.js';
import { manualConstructorStandingRows } from '../../data/f1/f1ManualConstructors.js';

const STANDINGS_FRESH_MS = Math.max(
  60_000,
  parseInt(process.env.CONSTRUCTOR_STANDINGS_CACHE_MS || String(5 * 60 * 1000), 10),
);
const STANDINGS_STALE_MS = Math.max(
  STANDINGS_FRESH_MS,
  parseInt(process.env.CONSTRUCTOR_STANDINGS_STALE_MS || String(30 * 60 * 1000), 10),
);
const REFRESH_COOLDOWN_MS = 15_000;

let cache = null;
let refreshInflight = null;
let lastRefreshAttempt = 0;

const normTeamKey = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

function normalizeConstructorStandings(raw) {
  const list = raw?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? [];
  return list.map((cs) => ({
    pos: parseInt(cs.position, 10),
    team: cs.Constructor.name,
    constructorId: cs.Constructor.constructorId ?? '',
    points: parseFloat(cs.points),
    wins: parseInt(cs.wins ?? '0', 10),
    nationality: cs.Constructor.nationality,
  }));
}

function mergeManualIntoLive(items) {
  const seen = new Set(
    items.map((r) => (r.constructorId || '').toLowerCase()).filter(Boolean),
  );
  const seenNames = new Set(items.map((r) => normTeamKey(r.team)));

  const extras = manualConstructorStandingRows()
    .filter((m) => {
      if (seen.has(m.constructorId)) return false;
      if (seenNames.has(normTeamKey(m.team))) return false;
      return true;
    })
    .map(({ _seasonYear, ...row }) => row);

  if (!extras.length) return items;

  const merged = [...items, ...extras].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.team.localeCompare(b.team);
  });

  return merged.map((row, i) => ({ ...row, pos: i + 1 }));
}

function overlayByConstructorId(liveRows) {
  const map = new Map();
  for (const row of liveRows) {
    const id = (row.constructorId || '').trim().toLowerCase();
    if (id) map.set(id, row);
  }
  return map;
}

/**
 * Respuesta inmediata para el listado de escuderías (sin esperar a Jolpica).
 */
export function buildConstructorStandingsFromGrid() {
  const live = cache?.items?.length ? overlayByConstructorId(cache.items) : null;
  const hasLive = Boolean(live?.size);

  let items = F1_CONSTRUCTORS_GRID_2026.map((g) => {
    const hit = live?.get(g.constructorId);
    if (hit) {
      return {
        pos: hit.pos,
        team: hit.team || g.team,
        constructorId: g.constructorId,
        points: hit.points,
        wins: hit.wins,
        nationality: hit.nationality || g.nationality,
      };
    }
    return {
      pos: g.gridOrder,
      team: g.team,
      constructorId: g.constructorId,
      points: 0,
      wins: 0,
      nationality: g.nationality,
    };
  });

  if (hasLive) {
    items = items.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.team.localeCompare(b.team);
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

export async function fetchLiveConstructorStandings() {
  const raw = await jolpicaClient.get('/current/constructorStandings.json', {
    timeoutMs: 12_000,
  });
  return mergeManualIntoLive(normalizeConstructorStandings(raw));
}

export function scheduleConstructorStandingsRefresh() {
  const now = Date.now();
  if (refreshInflight) return refreshInflight;
  if (now - lastRefreshAttempt < REFRESH_COOLDOWN_MS) return null;

  lastRefreshAttempt = now;
  refreshInflight = fetchLiveConstructorStandings()
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

export function getConstructorStandingsResponse() {
  const built = buildConstructorStandingsFromGrid();
  const age = cache?.ts ? Date.now() - cache.ts : Infinity;
  const needsRefresh = !cache || age > STANDINGS_FRESH_MS;

  if (needsRefresh) {
    scheduleConstructorStandingsRefresh();
  }

  return built;
}

/** Primera carga en frío: intenta Jolpica una vez si no hay caché (arranque del servidor). */
export async function warmConstructorStandingsCache() {
  if (cache?.items?.length) return cache.items;
  try {
    const items = await fetchLiveConstructorStandings();
    cache = { ts: Date.now(), items };
    return items;
  } catch {
    return null;
  }
}
