import {
  pulseliveClient,
  MOTOGP_CATEGORY_UUID,
} from '../../external/motogp/pulselive.client.js';

/** Categoría broadcast MotoGP™ (equipos / riders con fotos). */
export const MOTOGP_BROADCAST_CATEGORY_UUID = '737ab122-76e1-4081-bedb-334caaa18c70';

const TEAMS_CACHE_MS = 6 * 60 * 60_000;

let teamsCache = null;
let teamsCacheTs = 0;

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const pickPortrait = (rider) => {
  const step =
    rider?.current_career_step ??
    rider?.career?.find((c) => c.current) ??
    rider?.career?.[0];
  const pics = step?.pictures ?? rider?.pictures;
  return (
    pics?.portrait ||
    pics?.profile?.main ||
    pics?.profile?.secondary ||
    pics?.helmet?.main ||
    null
  );
};

const normalizeRider = (r) => ({
  driverId: r.id,
  legacyId: r.legacy_id != null ? Number(r.legacy_id) : null,
  givenName: r.name ?? '',
  familyName: r.surname ?? '',
  fullName: [r.name, r.surname].filter(Boolean).join(' ').trim(),
  number: r.current_career_step?.number ?? null,
  nationality: r.country?.iso ?? '',
  headshotUrl: pickPortrait(r),
  inGrid: r.current_career_step?.in_grid !== false,
});

const normalizeTeam = (t) => {
  const constructorName = t.constructor?.name ?? '';
  const name = t.name ?? constructorName;
  const slug = slugify(name);
  const constructorSlug = slugify(constructorName || name);
  return {
    teamId: t.id,
    constructorId: constructorSlug,
    constructorLegacyId: t.constructor?.legacy_id ?? null,
    name,
    constructorName,
    color: t.color ?? null,
    textColor: t.text_color ?? null,
    logoUrl: t.picture ?? null,
    bikeImageUrl: t.background_picture ?? null,
    nationality: '',
    riders: (t.riders ?? [])
      .filter((r) => r.published !== false && r.current_career_step?.in_grid !== false)
      .map(normalizeRider),
  };
};

/** Equipos oficiales de la temporada (logos, colores, roster). */
export const getTeamsIndex = async (seasonYear) => {
  const year =
    Number.parseInt(String(seasonYear ?? new Date().getFullYear()), 10) ||
    new Date().getFullYear();
  const now = Date.now();
  if (teamsCache?.year === year && now - teamsCacheTs < TEAMS_CACHE_MS) {
    return teamsCache.index;
  }

  const raw = await pulseliveClient.get(
    `/teams?categoryUuid=${MOTOGP_BROADCAST_CATEGORY_UUID}&seasonYear=${year}`,
    { freshTtlMs: TEAMS_CACHE_MS },
  );
  const list = (Array.isArray(raw) ? raw : []).map(normalizeTeam).filter((t) => t.name);

  const bySlug = new Map();
  const byConstructorSlug = new Map();
  const byTeamId = new Map();
  for (const t of list) {
    bySlug.set(t.constructorId, t);
    bySlug.set(slugify(t.name), t);
    if (t.constructorName) byConstructorSlug.set(slugify(t.constructorName), t);
    byTeamId.set(t.teamId, t);
  }

  const index = { year, list, bySlug, byConstructorSlug, byTeamId };
  teamsCache = { year, index };
  teamsCacheTs = now;
  return index;
};

export const findTeam = async (key, seasonYear) => {
  const k = String(key || '').trim().toLowerCase();
  if (!k) return null;
  const idx = await getTeamsIndex(seasonYear);
  return (
    idx.bySlug.get(k) ??
    idx.byConstructorSlug.get(k) ??
    idx.byTeamId.get(key) ??
    idx.list.find((t) => slugify(t.name).includes(k) || k.includes(slugify(t.name))) ??
    null
  );
};

export const enrichStandingRow = (row, idx) => {
  const rowSlug = slugify(row.team);
  let team =
    idx.bySlug.get(rowSlug) ??
    idx.bySlug.get(row.constructorId) ??
    idx.byConstructorSlug.get(row.constructorId) ??
    idx.byConstructorSlug.get(rowSlug);

  if (!team) {
    team = idx.list.find((t) => {
      const ts = slugify(t.name);
      return ts === rowSlug || ts.includes(rowSlug) || rowSlug.includes(ts);
    });
  }

  if (!team) return row;
  return {
    ...row,
    team: row.team || team.name,
    constructorId: slugify(team.name),
    teamColor: team.color ?? row.teamColor,
    logoUrl: team.logoUrl ?? row.logoUrl,
  };
};
