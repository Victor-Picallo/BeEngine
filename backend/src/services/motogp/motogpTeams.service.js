import {
  pulseliveClient,
  MOTOGP_CATEGORY_UUID,
} from '../../external/motogp/pulselive.client.js';
import { resolveMotogpTeamLogoUrl } from '../../data/motogp/motogpTeamLogos.js';
import { resolveMoto2TeamLogoUrl } from '../../data/moto2/moto2TeamLogos.js';
import { resolveMoto3TeamLogoUrl } from '../../data/moto3/moto3TeamLogos.js';

/** Categoría broadcast MotoGP™ (equipos / riders con fotos). */
export const MOTOGP_BROADCAST_CATEGORY_UUID = '737ab122-76e1-4081-bedb-334caaa18c70';
export const MOTO2_BROADCAST_CATEGORY_UUID   = 'ea854a67-73a4-4a28-ac77-d67b3b2a530a';
export const MOTO3_BROADCAST_CATEGORY_UUID   = '1ab203aa-e292-4842-8bed-971911357af1';

const BROADCAST_UUIDS = {
  motogp: MOTOGP_BROADCAST_CATEGORY_UUID,
  moto2:  MOTO2_BROADCAST_CATEGORY_UUID,
  moto3:  MOTO3_BROADCAST_CATEGORY_UUID,
};

/**
 * PulseLive devuelve #262626 (placeholder genérico) para varios equipos.
 * Este mapa sobrescribe esos colores con los colores de marca reales.
 * Clave: slug del nombre de equipo (minúsculas, sin acentos, guiones).
 */
const TEAM_COLOR_OVERRIDES = {
  'pertamina-enduro-vr46-racing-team': '#C6D637', // VR46 amarillo-lima fluorescente (marca Rossi/VR46)
  'vr46-racing-team':                  '#C6D637',
  'prima-pramac-yamaha-motogp':        '#5B2D8E', // Pramac morado oscuro (identidad de marca Pramac)
  'prima-pramac-yamaha':               '#5B2D8E',
  'red-bull-ktm-tech3':                '#FF6600', // KTM naranja oficial (Pantone 021C)
  'trackhouse-motogp-team':            '#0057B8', // Trackhouse azul eléctrico
  'castrol-honda-lcr':                 '#009343', // LCR Honda verde Castrol oficial
  'lcr-honda':                         '#009343',
  'blu-cru-pramac-yamaha-moto2':       '#5B2D8E',
  'cfmoto-aspar-team':                 '#E30613',
  'elf-marc-vds-racing-team':          '#00A651',
  'liqui-moly-dynavolt-intact-gp':     '#FFD100',
  'red-bull-ktm-ajo':                  '#FF6600',
  'reds-fantic-racing':                '#E4002B',
  'speedrs-team':                      '#003DA5',
  'onlyfans-american-racing-team':     '#1E3A8A',
  'qj-motor-galfer-msi':               '#111111',
};

const TEAMS_CACHE_MS = 6 * 60 * 60_000;

const teamsCacheMap = new Map(); // key: `${year}-${categoryId}`

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

const isBikePicture = (url) =>
  Boolean(url && /\/main-picture\.|FrontalBike_/i.test(String(url)));

const pickPulseTeamLogo = (t) => {
  const candidates = [t.logo?.main, t.logo?.secondary, t.picture, t.background_picture];
  for (const url of candidates) {
    if (url && !isBikePicture(url)) return url;
  }
  return null;
};

const normalizeTeam = (t, categoryId = 'motogp') => {
  const constructorName = t.constructor?.name ?? '';
  const name = t.name ?? constructorName;
  const slug = slugify(name);
  const constructorSlug = slugify(constructorName || name);
  const picture = t.picture ?? null;
  const bg = t.background_picture ?? null;
  const bikeImageUrl = isBikePicture(picture)
    ? picture
    : isBikePicture(bg)
      ? bg
      : picture ?? bg ?? null;
  const rawColor = t.color ?? null;
  const color = TEAM_COLOR_OVERRIDES[slug] ?? (rawColor && rawColor !== '#262626' ? rawColor : null);
  const logoUrl =
    categoryId === 'motogp'
      ? resolveMotogpTeamLogoUrl(t.id, slug, name)
      : categoryId === 'moto2'
        ? resolveMoto2TeamLogoUrl(t.id, slug, name) ?? pickPulseTeamLogo(t)
        : categoryId === 'moto3'
          ? resolveMoto3TeamLogoUrl(t.id, slug, name) ?? pickPulseTeamLogo(t)
          : pickPulseTeamLogo(t);

  return {
    teamId: t.id,
    constructorId: slug,
    constructorLegacyId: t.constructor?.legacy_id ?? null,
    name,
    constructorName,
    color,
    textColor: t.text_color ?? null,
    logoUrl,
    bikeImageUrl,
    nationality: '',
    riders: (t.riders ?? [])
      .filter((r) => r.published !== false && r.current_career_step?.in_grid !== false)
      .map(normalizeRider),
  };
};

/** Equipos oficiales de la temporada (logos, colores, roster). */
export const getTeamsIndex = async (seasonYear, categoryId = 'motogp') => {
  const year =
    Number.parseInt(String(seasonYear ?? new Date().getFullYear()), 10) ||
    new Date().getFullYear();
  const cacheKey = `${year}-${categoryId}`;
  const now = Date.now();
  const cached = teamsCacheMap.get(cacheKey);
  if (cached && now - cached.ts < TEAMS_CACHE_MS) {
    return cached.index;
  }

  const broadcastUuid = BROADCAST_UUIDS[categoryId] ?? MOTOGP_BROADCAST_CATEGORY_UUID;
  const raw = await pulseliveClient.get(
    `/teams?categoryUuid=${broadcastUuid}&seasonYear=${year}`,
    { freshTtlMs: TEAMS_CACHE_MS },
  );
  const list = (Array.isArray(raw) ? raw : [])
    .map((t) => normalizeTeam(t, categoryId))
    .filter((t) => t.name);

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
  teamsCacheMap.set(cacheKey, { index, ts: now });
  return index;
};

export const findTeam = async (key, seasonYear, categoryId = 'motogp') => {
  const k = String(key || '').trim().toLowerCase();
  if (!k) return null;
  const idx = await getTeamsIndex(seasonYear, categoryId);
  return (
    idx.bySlug.get(k) ??
    idx.byConstructorSlug.get(k) ??
    idx.byTeamId.get(key) ??
    idx.list.find((t) => slugify(t.name).includes(k) || k.includes(slugify(t.name))) ??
    null
  );
};

export const enrichStandingRow = (row, idx, categoryId = 'motogp') => {
  const rowSlug = slugify(row.team) || row.constructorId || '';
  const resolvedLogo =
    categoryId === 'motogp'
      ? resolveMotogpTeamLogoUrl(row.teamId, rowSlug, row.team)
      : categoryId === 'moto2'
        ? resolveMoto2TeamLogoUrl(row.teamId, rowSlug, row.team)
        : categoryId === 'moto3'
          ? resolveMoto3TeamLogoUrl(row.teamId, rowSlug, row.team)
          : null;

  const team =
    idx.bySlug.get(rowSlug) ??
    idx.bySlug.get(row.constructorId) ??
    idx.list.find((t) => slugify(t.name) === rowSlug);

  if (!team) {
    return {
      ...row,
      constructorId: rowSlug,
      logoUrl: row.logoUrl ?? resolvedLogo ?? null,
    };
  }

  const logoUrl =
    categoryId === 'motogp'
      ? row.logoUrl ?? resolvedLogo ?? team.logoUrl
      : categoryId === 'moto2' || categoryId === 'moto3'
        ? row.logoUrl ?? resolvedLogo ?? team.logoUrl
        : row.logoUrl ?? team.logoUrl ?? null;

  return {
    ...row,
    constructorId: rowSlug,
    teamId: team.teamId ?? row.teamId,
    teamColor: team.color ?? row.teamColor,
    logoUrl,
    bikeImageUrl: team.bikeImageUrl ?? row.bikeImageUrl,
  };
};
