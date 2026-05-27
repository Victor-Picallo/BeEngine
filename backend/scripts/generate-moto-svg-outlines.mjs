/**
 * Trazados de circuitos de motos desde el SVG oficial de Pulse (Supabase).
 *
 * El SVG «info» de Pulse trae el trazado real como el path MÁS LARGO; los demás
 * son marcadores de curva (círculos) y etiquetas. OpenStreetMap es poco fiable
 * para estos circuitos (contornos del recinto / fragmentos), así que el SVG
 * oficial es la fuente de verdad.
 *
 * Los puntos se guardan como coords [x/1e5, -y/1e5] para que `projectCircuitCoords`
 * (que aplica cos(lat)·1e5 y -lat·1e5) los reproduzca tal cual: con valores tan
 * pequeños cos(lat)≈1, de modo que out = [x, y]. Así el catálogo de trazados y
 * todas las superficies (cards, MotoGP live, feeder Moto2/Moto3) funcionan igual.
 *
 * Uso: npm run circuit:moto-svg
 */
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { svgPathProperties } from 'svg-path-properties';
import { getCalendar } from '../src/services/motogp/pulseLive.service.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outPath = join(
  root,
  'frontend',
  'src',
  'app',
  'features',
  'calendar',
  'moto-circuits.generated.ts',
);

const SAMPLES = 240;

/** Nombre/localidad normalizado → id de trazado. Solo circuitos «de motos»;
 * las sedes compartidas con F1 (COTA, Mugello, Sepang…) usan el GPS bacinger. */
const OSM_ALIASES = {
  jerez: 'osm-jerez',
  'circuito de jerez': 'osm-jerez',
  'angel nieto': 'osm-jerez',
  assen: 'osm-assen',
  'tt circuit assen': 'osm-assen',
  sachsenring: 'osm-sachsenring',
  motegi: 'osm-motegi',
  'mobility resort motegi': 'osm-motegi',
  mandalika: 'osm-mandalika',
  'pertamina mandalika': 'osm-mandalika',
  'phillip island': 'osm-phillip-island',
  buriram: 'osm-buriram',
  'chang international': 'osm-buriram',
  termas: 'osm-termas',
  'termas de rio hondo': 'osm-termas',
  bugatti: 'osm-bugatti',
  'le mans': 'osm-bugatti',
  valencia: 'osm-valencia',
  'ricardo tormo': 'osm-valencia',
  aragon: 'osm-aragon',
  motorland: 'osm-aragon',
  goiania: 'osm-goiania',
  'autodromo internacional de goiania': 'osm-goiania',
  'ayrton senna': 'osm-goiania',
  brno: 'osm-brno',
  'automotodrom brno': 'osm-brno',
  masaryk: 'osm-brno',
  balaton: 'osm-balaton',
  'balaton park': 'osm-balaton',
};

const stripAccents = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
const normalize = (s) =>
  stripAccents(String(s ?? '').toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim();

function resolveOutlineId(race) {
  for (const q of [race.circuitName, race.locality].map(normalize).filter(Boolean)) {
    if (OSM_ALIASES[q]) return OSM_ALIASES[q];
    for (const [alias, id] of Object.entries(OSM_ALIASES)) {
      if (q.length >= 4 && (q.includes(alias) || alias.includes(q))) return id;
    }
  }
  return null;
}

/** Extrae el path más largo (= trazado) del SVG. */
function pickTrackPath(svgText) {
  const paths = [...svgText.matchAll(/<path[^>]*\bd="([^"]+)"[^>]*>/g)].map((m) => m[1]);
  if (!paths.length) return null;
  return paths.reduce((a, b) => (b.length > a.length ? b : a), '');
}

function samplePath(d) {
  const props = new svgPathProperties(d);
  const len = props.getTotalLength();
  if (!Number.isFinite(len) || len < 1) return [];
  const pts = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const { x, y } = props.getPointAtLength((i / SAMPLES) * len);
    if (Number.isFinite(x) && Number.isFinite(y)) pts.push([x, y]);
  }
  return pts;
}

async function main() {
  const { items } = await getCalendar('motogp');
  const outlines = [];
  const map = {};
  const seen = new Set();

  for (const race of items) {
    const id = resolveOutlineId(race);
    const url = (race.circuitSvgUrl ?? '').trim();
    if (!id) {
      console.log('· skip (F1-shared / sin id)', race.circuitName);
      continue;
    }
    if (!url || !/\.svg(\?|$)/i.test(url)) {
      console.log('✗ sin SVG', race.circuitName, id);
      continue;
    }
    // mapea el circuitId del calendario → id de trazado (resolución directa en frontend)
    if (race.circuitId) map[race.circuitId] = id;
    if (seen.has(id)) continue;

    try {
      const svg = await (await fetch(url)).text();
      const d = pickTrackPath(svg);
      const raw = d ? samplePath(d) : [];
      if (raw.length < 30) {
        console.log('✗ pocos puntos', race.circuitName, id, raw.length);
        continue;
      }
      const coords = raw.map(([x, y]) => [
        Number((x / 1e5).toFixed(7)),
        Number((-y / 1e5).toFixed(7)),
      ]);
      outlines.push({ id, name: race.circuitName, location: race.locality ?? '', coords });
      seen.add(id);
      console.log('✓', id, race.circuitName, `(${coords.length} pts)`);
    } catch (e) {
      console.log('✗ error', race.circuitName, id, e.message);
    }
  }

  const body = `// AUTO-GENERATED — no editar. npm run circuit:moto-svg
// Trazados de circuitos de motos extraídos del SVG oficial de Pulse (path más largo).
import type { OfficialCircuit } from './official-circuits';

export const MOTO_CIRCUIT_OUTLINES: OfficialCircuit[] = ${JSON.stringify(outlines, null, 2)} as OfficialCircuit[];

/** circuitId del calendario Pulse → id de trazado de motos. */
export const PULSE_CIRCUIT_MOTO_MAP: Record<string, string> = ${JSON.stringify(map, null, 2)};
`;

  await writeFile(outPath, body, 'utf8');
  console.log(`\nWrote ${outlines.length} outlines, ${Object.keys(map).length} id mappings → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
