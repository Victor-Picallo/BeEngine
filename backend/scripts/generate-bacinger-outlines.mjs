/**
 * Genera trazados GPS reales (bacinger/f1-circuits + OSM verificados) para el frontend.
 * Uso: npm run circuit:outlines
 */
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://raw.githubusercontent.com/bacinger/f1-circuits/master';
const OSM_UA = { 'User-Agent': 'BeEngine/1.0 (circuit-outlines; contact@beengine.local)' };
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outPath = join(
  root,
  'frontend',
  'src',
  'app',
  'features',
  'calendar',
  'bacinger-outlines.generated.ts',
);

/** Geometría verificada en OpenStreetMap (way/relation). IDs corregidos 2026-05. */
const OSM_TRACKS = [
  { id: 'osm-jerez', name: 'Circuito de Jerez - Ángel Nieto', location: 'Jerez', osmType: 'way', osmId: 831985059 },
  { id: 'osm-assen', name: 'TT Circuit Assen', location: 'Assen', osmType: 'way', osmId: 598516040 },
  { id: 'osm-sachsenring', name: 'Sachsenring', location: 'Hohenstein-Ernstthal', osmType: 'way', osmId: 31321783 },
  { id: 'osm-motegi', name: 'Mobility Resort Motegi', location: 'Motegi', osmType: 'way', osmId: 438022472 },
  { id: 'osm-mandalika', name: 'Pertamina Mandalika Circuit', location: 'Lombok', osmType: 'way', osmId: 942267288 },
  { id: 'osm-phillip-island', name: 'Phillip Island Grand Prix Circuit', location: 'Phillip Island', osmType: 'way', osmId: 28135653 },
  { id: 'osm-buriram', name: 'Chang International Circuit', location: 'Buriram', osmType: 'way', osmId: 564769597 },
  { id: 'osm-termas', name: 'Autódromo Termas de Río Hondo', location: 'Termas de Rio Hondo', osmType: 'way', osmId: 341878304 },
  { id: 'osm-bugatti', name: 'Circuit Bugatti', location: 'Le Mans', osmType: 'relation', osmId: 2725877 },
  {
    id: 'osm-valencia',
    name: 'Circuit Ricardo Tormo',
    location: 'Cheste',
    osmType: 'way',
    osmId: 556951684,
  },
  {
    id: 'osm-aragon',
    name: 'MotorLand Aragón',
    location: 'Alcañiz',
    osmType: 'way',
    osmId: 55839708,
  },
  {
    id: 'osm-goiania',
    name: 'Autódromo Internacional Ayrton Senna',
    location: 'Goiânia',
    osmType: 'relation',
    osmId: 15921950,
  },
  { id: 'osm-brno', name: 'Automotodrom Brno', location: 'Brno', osmType: 'way', osmId: 8585805 },
  {
    id: 'osm-balaton',
    name: 'Balaton Park Circuit',
    location: 'Balatonfőkajár',
    osmType: 'way',
    osmId: 338856660,
  },
];

function coordsFromGeoJsonFeature(feature) {
  const g = feature?.geometry;
  if (!g) return [];
  if (g.type === 'LineString') return g.coordinates;
  if (g.type === 'MultiLineString') {
    let best = g.coordinates[0] ?? [];
    for (const line of g.coordinates) {
      if (line.length > best.length) best = line;
    }
    return best;
  }
  return [];
}

/** OSM API 0.6 — más fiable que Overpass en CI/redes restrictivas. */
async function coordsFromOsmApi(osmType, osmId) {
  const url = `https://api.openstreetmap.org/api/0.6/${osmType}/${osmId}/full.json`;
  const res = await fetch(url, { headers: OSM_UA });
  if (!res.ok) throw new Error(`OSM API ${osmType}/${osmId}: HTTP ${res.status}`);

  const j = await res.json();
  const nodeMap = new Map(
    j.elements.filter((e) => e.type === 'node').map((n) => [n.id, [n.lon, n.lat]]),
  );

  if (osmType === 'way') {
    const w = j.elements.find((e) => e.type === 'way' && e.id === osmId);
    if (!w?.nodes?.length) return [];
    return w.nodes.map((nid) => nodeMap.get(nid)).filter(Boolean);
  }

  const rel = j.elements.find((e) => e.type === 'relation' && e.id === osmId);
  const ways = j.elements.filter((e) => e.type === 'way');
  const coords = [];
  for (const m of rel?.members ?? []) {
    if (m.type !== 'way') continue;
    if (m.role && !['', 'outer'].includes(m.role)) continue;
    const w = ways.find((x) => x.id === m.ref);
    if (!w) continue;
    for (const nid of w.nodes) {
      const p = nodeMap.get(nid);
      if (p) coords.push(p);
    }
  }
  return coords;
}

async function fetchBacinger(id, meta) {
  const res = await fetch(`${BASE}/circuits/${id}.geojson`);
  if (!res.ok) throw new Error(`bacinger ${id}: HTTP ${res.status}`);
  const gj = await res.json();
  const features = gj.features ?? (gj.type === 'Feature' ? [gj] : []);
  let best = [];
  for (const f of features) {
    const c = coordsFromGeoJsonFeature(f);
    if (c.length > best.length) best = c;
  }
  if (best.length < 20) throw new Error(`bacinger ${id}: too few points (${best.length})`);
  return {
    id,
    name: meta.name,
    location: meta.location,
    coords: best,
  };
}

async function main() {
  const locations = await fetch(`${BASE}/f1-locations.json`).then((r) => r.json());
  const circuits = [];

  for (const loc of locations) {
    try {
      circuits.push(await fetchBacinger(loc.id, loc));
      console.log(`  ✓ ${loc.id} ${loc.name}`);
    } catch (e) {
      console.warn(`  ✗ ${loc.id}: ${e.message}`);
    }
  }

  for (const t of OSM_TRACKS) {
    try {
      const coords = await coordsFromOsmApi(t.osmType, t.osmId);
      if (coords.length < 20) throw new Error(`too few points (${coords.length})`);
      circuits.push({ id: t.id, name: t.name, location: t.location, coords });
      console.log(`  ✓ ${t.id} ${t.name} (${coords.length} pts, OSM ${t.osmType}/${t.osmId})`);
    } catch (e) {
      console.warn(`  ✗ ${t.id}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 1100));
  }

  const body = `// AUTO-GENERATED — no editar. npm run circuit:outlines
import type { OfficialCircuit } from './official-circuits';

export const BACINGER_OUTLINES: OfficialCircuit[] = ${JSON.stringify(circuits, null, 2)} as OfficialCircuit[];
`;

  await writeFile(outPath, body, 'utf8');
  console.log(`\nWrote ${circuits.length} circuits → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
