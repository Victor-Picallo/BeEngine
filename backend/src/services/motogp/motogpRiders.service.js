import { pulseliveClient } from '../../external/motogp/pulselive.client.js';

const RIDERS_CACHE_MS = 6 * 60 * 60_000;

let ridersCache = null;
let ridersCacheTs = 0;

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const asList = (raw) => (Array.isArray(raw) ? raw : raw?.value ?? []);

const pickPortrait = (rider) => {
  const step = rider?.current_career_step ?? rider?.career?.find((c) => c.current) ?? rider?.career?.[0];
  const pics = step?.pictures ?? rider?.pictures;
  return (
    pics?.portrait ||
    pics?.profile?.main ||
    pics?.profile?.secondary ||
    pics?.helmet?.main ||
    null
  );
};

const normalizeRider = (r) => {
  const fullName = [r.name, r.surname].filter(Boolean).join(' ').trim();
  const id = r.id ?? r.rider_api_uuid ?? r.riders_api_uuid;
  const legacyId = r.legacy_id ?? r.legacyId;
  return {
    id,
    legacyId: legacyId != null ? Number(legacyId) : null,
    slug: slugify(fullName),
    givenName: r.name ?? '',
    familyName: r.surname ?? '',
    fullName,
    nationality: r.country?.iso ?? '',
    birthDate: r.birth_date ?? null,
    number: r.current_career_step?.number ?? r.career?.find((c) => c.current)?.number ?? null,
    team: r.current_career_step?.team?.name ?? r.current_career_step?.sponsored_team ?? null,
    constructorId: slugify(
      r.current_career_step?.team?.constructor?.name ??
        r.current_career_step?.team?.name ??
        '',
    ),
    portraitUrl: pickPortrait(r),
    published: r.published !== false,
  };
};

/** Índice de pilotos de la temporada (fotos oficiales motogp.com). */
export const getRidersIndex = async () => {
  const now = Date.now();
  if (ridersCache && now - ridersCacheTs < RIDERS_CACHE_MS) return ridersCache;

  const raw = await pulseliveClient.get('/riders', { freshTtlMs: RIDERS_CACHE_MS });
  const list = asList(raw).map(normalizeRider).filter((r) => r.id);

  const byId = new Map();
  const bySlug = new Map();
  const byLegacyId = new Map();
  for (const r of list) {
    byId.set(r.id, r);
    if (r.slug) bySlug.set(r.slug, r);
    if (Number.isFinite(r.legacyId)) byLegacyId.set(r.legacyId, r);
  }

  ridersCache = { list, byId, bySlug, byLegacyId };
  ridersCacheTs = now;
  return ridersCache;
};

export const findRider = async (driverId) => {
  const key = String(driverId || '').trim();
  if (!key) return null;
  const idx = await getRidersIndex();
  return (
    idx.byId.get(key) ??
    idx.bySlug.get(key.toLowerCase()) ??
    idx.byLegacyId.get(Number.parseInt(key, 10)) ??
    null
  );
};

export const getRiderPortraitUrl = async (driverId) => {
  const r = await findRider(driverId);
  return r?.portraitUrl ?? null;
};

export const getRiderDetail = async (driverId) => {
  const found = await findRider(driverId);
  if (!found?.id) return null;
  try {
    const raw = await pulseliveClient.get(`/riders/${found.id}`, {
      freshTtlMs: 30 * 60_000,
    });
    return { ...normalizeRider(raw), raw };
  } catch {
    return found;
  }
};

export const getRiderStats = async (legacyId) => {
  const id = Number(legacyId);
  if (!Number.isFinite(id)) return null;
  return pulseliveClient.get(`/riders/${id}/stats`, { freshTtlMs: 60 * 60_000 });
};

export const getRiderStatisticsBySeason = async (legacyId) => {
  const id = Number(legacyId);
  if (!Number.isFinite(id)) return [];
  const raw = await pulseliveClient.get(`/riders/${id}/statistics`, {
    freshTtlMs: 60 * 60_000,
  });
  return asList(raw);
};
