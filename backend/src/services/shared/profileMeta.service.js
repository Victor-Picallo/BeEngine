import { DB_ENABLED } from '../../config/env.js';
import { requirePrisma } from '../../lib/prisma.js';

const DRIVER_ALIASES = { lindblad: 'arvid_lindblad' };

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

let loadPromise = null;
/** @type {Map<string, { kind: string, seriesId: string | null, payload: object }>} */
let byId = new Map();
/** @type {Map<string, object>} */
let teamProfilesByConstructorId = new Map();

async function loadAll() {
  if (!DB_ENABLED) return;
  const rows = await requirePrisma().profileMeta.findMany();
  byId = new Map(rows.map((r) => [r.id, { kind: r.kind, seriesId: r.seriesId, payload: r.payload }]));
  teamProfilesByConstructorId = new Map();
  for (const row of rows) {
    if (row.kind !== 'team_profile' || row.seriesId !== 'motogp') continue;
    const def = row.payload;
    if (def?.constructorId) {
      teamProfilesByConstructorId.set(slugify(def.constructorId), def);
    }
  }
}

export async function ensureProfileMetaLoaded() {
  if (byId.size > 0) return;
  if (!loadPromise) loadPromise = loadAll().catch(() => {});
  await loadPromise;
}

function payload(id) {
  return byId.get(id)?.payload ?? null;
}

export async function getDriverHistoricalStats(driverId) {
  await ensureProfileMetaLoaded();
  let id = String(driverId || '').trim().toLowerCase();
  id = DRIVER_ALIASES[id] ?? id;
  const hit = payload(`f1_driver_${id}`);
  if (!hit) return null;
  return {
    championships: hit.championships,
    stats: { ...hit.stats },
    maxCareerPts: hit.maxCareerPts,
    debut: hit.debut,
  };
}

export function mergeDriverHistoricalWithLive(historical, live = {}) {
  if (!historical) return null;

  let championships = historical.championships;
  const stats = { ...historical.stats };
  const seasonYear = live.seasonYear ?? new Date().getUTCFullYear();
  const standingWins = Math.max(0, parseInt(String(live.standing?.wins ?? '0'), 10) || 0);
  const standingPts = parseFloat(live.standing?.points ?? '0') || 0;

  stats.wins = historical.stats.wins + standingWins;
  stats.points = Math.round((historical.stats.points + standingPts) * 10) / 10;
  stats.winsCurrentSeason = standingWins;

  if (live.currentYearRow?.year === seasonYear && live.currentYearRow.titleWon) {
    championships += 1;
  }

  return { championships, stats, maxCareerPts: historical.maxCareerPts };
}

export async function getConstructorHistoricalStats(constructorId) {
  await ensureProfileMetaLoaded();
  const id = String(constructorId || '').trim().toLowerCase();
  const hit = payload(`f1_constructor_${id}`);
  if (!hit) return null;
  return {
    stats: {
      championships: hit.championships,
      totalWins: hit.totalWins,
      totalPodiums: hit.totalPodiums,
      totalPoles: hit.totalPoles,
    },
    maxCareerPts: hit.maxCareerPts,
    throughSeason: hit.throughSeason ?? 2025,
  };
}

export function mergeHistoricalWithLive(historical, live = {}) {
  if (!historical?.stats) return null;

  const stats = { ...historical.stats };
  const seasonYear = live.seasonYear ?? new Date().getUTCFullYear();
  const standingWins = Math.max(0, parseInt(String(live.standing?.wins ?? '0'), 10) || 0);
  const row = live.currentYearRow;
  const rowWins =
    row && row.year === seasonYear ? Math.max(0, parseInt(String(row.wins ?? '0'), 10) || 0) : 0;

  stats.totalWins = historical.stats.totalWins + Math.max(standingWins, rowWins);

  if (row?.year === seasonYear && row.titleWon) {
    stats.championships = historical.stats.championships + 1;
  }

  return {
    stats,
    maxCareerPts: historical.maxCareerPts,
  };
}

export const teamSlugMatchesProfile = (teamSlug, profile) => {
  const slug = slugify(teamSlug);
  if (!slug || !profile) return false;
  const keys = [profile.constructorId, ...(profile.slugAliases ?? [])].map(slugify);
  return keys.some((k) => k === slug || slug.includes(k) || k.includes(slug));
};

export const createDynamicTeamProfileDef = (constructorId, teamName) => {
  const id = slugify(constructorId || teamName);
  if (!id) return null;
  return {
    constructorId: id,
    name: teamName || id,
    nationality: '',
    wikiUrl: '',
    bioText: '',
    championships: 0,
    slugAliases: [id],
    debutYear: 2002,
  };
};

export async function getMotogpTeamProfileDef(constructorId) {
  await ensureProfileMetaLoaded();
  const key = slugify(constructorId);
  if (teamProfilesByConstructorId.has(key)) {
    return teamProfilesByConstructorId.get(key);
  }
  for (const def of teamProfilesByConstructorId.values()) {
    if (teamSlugMatchesProfile(key, def)) return def;
  }
  return null;
}

export async function getManufacturerHistorical(manufacturerSlug) {
  await ensureProfileMetaLoaded();
  const key = slugify(manufacturerSlug);
  return payload(`motogp_mfr_hist_${key}`);
}

export async function isManufacturerChampionYear(manufacturerSlug, year) {
  const hist = await getManufacturerHistorical(manufacturerSlug);
  return Boolean(hist?.championshipYears?.includes(Number(year)));
}

export async function getTeamHistorical(constructorId) {
  await ensureProfileMetaLoaded();
  const key = slugify(constructorId);
  return payload(`motogp_team_hist_${key}`);
}

/** Slug del grid oficial MotoGP (11 equipos) vía profile_meta, con fallback a slug del nombre. */
export async function resolveOfficialConstructorSlug(_teamId, constructorId, teamName) {
  const def =
    (await getMotogpTeamProfileDef(constructorId)) ??
    (await getMotogpTeamProfileDef(teamName));
  if (def) return def.constructorId;
  const slug = slugify(teamName || constructorId);
  if (!slug) return null;
  const hit = await getMotogpTeamProfileDef(slug);
  return hit?.constructorId ?? slug;
}
