import { pulseliveClient } from '../../external/motogp/pulselive.client.js';

const CIRCUITS_CACHE_MS = 6 * 60 * 60_000;

let circuitsCache = new Map();

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const normalizeCircuit = (circuit, eventMeta = {}) => {
  if (!circuit?.id) return null;
  const track = circuit.track ?? {};
  const assets = track.assets ?? {};
  return {
    circuitId: circuit.id,
    slug: slugify(circuit.name),
    name: circuit.name ?? '—',
    country: circuit.country ?? eventMeta.country ?? '',
    city: circuit.city ?? '',
    locality: circuit.city ?? circuit.region ?? '',
    lat: circuit.lat ? Number(circuit.lat) : null,
    lng: circuit.lng ? Number(circuit.lng) : null,
    lengthM: track.lenght ? Number(track.lenght) : null,
    lengthUnits: track.lenght_units ?? null,
    widthM: track.width ? Number(track.width) : null,
    leftCorners: track.left_corners ?? null,
    rightCorners: track.right_corners ?? null,
    longestStraightM: track.longest_straight ? Number(track.longest_straight) : null,
    svgUrl: assets.info?.path ?? null,
    imageUrl: assets.simple?.path ?? null,
    designer: circuit.designer ?? null,
    yearBuilt: circuit.constructed ?? null,
  };
};

/** Circuitos del calendario (API broadcast /events) con SVG oficial y metadata. */
export const getCircuits = async (seasonYear) => {
  const year =
    Number.parseInt(String(seasonYear ?? new Date().getFullYear()), 10) ||
    new Date().getFullYear();
  const cacheKey = String(year);
  const cached = circuitsCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CIRCUITS_CACHE_MS) return cached.data;

  const events = await pulseliveClient.get(`/events?seasonYear=${year}`, {
    freshTtlMs: CIRCUITS_CACHE_MS,
  });
  const list = Array.isArray(events) ? events : [];

  const byId = new Map();
  for (const ev of list) {
    if (ev.test) continue;
    const c = normalizeCircuit(ev.circuit, { country: ev.country });
    if (!c) continue;
    if (!byId.has(c.circuitId)) {
      byId.set(c.circuitId, {
        ...c,
        events: [],
      });
    }
    byId.get(c.circuitId).events.push({
      eventId: ev.id,
      name: ev.sponsored_name?.trim() || ev.name,
      dateStart: ev.date_start ?? null,
      status: ev.status ?? null,
    });
  }

  const items = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  const data = { source: 'pulselive-motogp', seasonYear: year, items };
  circuitsCache.set(cacheKey, { data, ts: Date.now() });
  return data;
};

export const getCircuitById = async (circuitId, seasonYear) => {
  const { items } = await getCircuits(seasonYear);
  const key = String(circuitId || '').trim();
  return (
    items.find((c) => c.circuitId === key) ??
    items.find((c) => c.slug === key.toLowerCase()) ??
    null
  );
};

const STOP_WORDS = new Set([
  'circuit',
  'international',
  'grand',
  'prix',
  'gp',
  'gran',
  'premio',
  'raceway',
  'track',
  'de',
  'del',
  'the',
  'of',
]);

const GP_TITLE_SLUG = /^(gran-)?premio|grand-prix|gp-|grosser/;

/** Resuelve SVG/metadata por nombre de circuito (calendario / home). */
export const findCircuitByName = async (name, seasonYear) => {
  const q = slugify(name);
  if (!q || GP_TITLE_SLUG.test(q)) return null;
  const { items } = await getCircuits(seasonYear);
  const exact = items.find((c) => slugify(c.name) === q);
  if (exact) return exact;

  const tokens = q.split('-').filter((t) => t.length >= 4 && !STOP_WORDS.has(t));
  if (!tokens.length) return null;

  const segmentMatch = items.filter((c) => {
    const parts = slugify(c.name).split('-').filter(Boolean);
    return tokens.every((t) => parts.includes(t));
  });
  if (segmentMatch.length === 1) return segmentMatch[0];
  return null;
};
