/**
 * Mapea circuitId (Pulse) → id de trazado GPS (bacinger/OSM).
 * Uso: node scripts/generate-pulse-outline-map.mjs
 */
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCircuits } from '../src/services/motogp/motogpCircuits.service.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outPath = join(
  root,
  'frontend',
  'src',
  'app',
  'features',
  'calendar',
  'pulse-circuit-outline-map.generated.ts',
);

const ALIASES = {
  'circuit of the americas': 'us-2012',
  cota: 'us-2012',
  austin: 'us-2012',
  'circuit de barcelona catalunya': 'es-1991',
  catalunya: 'es-1991',
  barcelona: 'es-1991',
  montmelo: 'es-1991',
  mugello: 'it-1914',
  hungaroring: 'hu-1986',
  'red bull ring': 'at-1969',
  spielberg: 'at-1969',
  silverstone: 'gb-1948',
  sepang: 'my-1999',
  portimao: 'pt-2008',
  algarve: 'pt-2008',
  losail: 'qa-2004',
  lusail: 'qa-2004',
  monza: 'it-1922',
  imola: 'it-1953',
  suzuka: 'jp-1962',
  'marina bay': 'sg-2008',
  singapore: 'sg-2008',
  interlagos: 'br-1940',
  assen: 'osm-assen',
  'tt circuit assen': 'osm-assen',
  jerez: 'osm-jerez',
  sachsenring: 'osm-sachsenring',
  motegi: 'osm-motegi',
  'mobility resort motegi': 'osm-motegi',
  mandalika: 'osm-mandalika',
  'phillip island': 'osm-phillip-island',
  buriram: 'osm-buriram',
  'chang international': 'osm-buriram',
  termas: 'osm-termas',
  'termas de rio hondo': 'osm-termas',
  bugatti: 'osm-bugatti',
  'circuit bugatti': 'osm-bugatti',
  'le mans': 'osm-bugatti',
  lemans: 'osm-bugatti',
  aragon: 'osm-aragon',
  'motorland aragon': 'osm-aragon',
  alcaniz: 'osm-aragon',
  misano: 'it-1953',
  'misano world circuit': 'it-1953',
  valencia: 'osm-valencia',
  'ricardo tormo': 'osm-valencia',
  cheste: 'osm-valencia',
  goiania: 'osm-goiania',
  'autodromo internacional de goiania': 'osm-goiania',
  brno: 'osm-brno',
  'automotodrom brno': 'osm-brno',
  masaryk: 'osm-brno',
  balaton: 'osm-balaton',
  'balaton park': 'osm-balaton',
  'autodromo jose carlos pace': 'br-1940',
  'bahrain international': 'bh-2002',
  'yas marina': 'ae-2009',
  'losail international': 'qa-2004',
};

const stripAccents = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
const normalize = (s) =>
  stripAccents(String(s ?? '').toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim();

function resolveOutlineId(circuit) {
  const parts = [circuit.name, circuit.locality, circuit.city, circuit.country, circuit.slug]
    .map(normalize)
    .filter(Boolean);
  for (const q of parts) {
    if (ALIASES[q]) return ALIASES[q];
    for (const [alias, id] of Object.entries(ALIASES)) {
      if (q.length >= 4 && (q.includes(alias) || alias.includes(q))) return id;
    }
  }
  return null;
}

async function main() {
  const year = new Date().getFullYear();
  const { items } = await getCircuits(year);
  const map = {};
  for (const c of items) {
    const outlineId = resolveOutlineId(c);
    if (outlineId) map[c.circuitId] = outlineId;
    console.log(
      outlineId ? '✓' : '✗',
      c.circuitId,
      c.name,
      outlineId ?? '',
    );
  }
  const body = `// AUTO-GENERATED — npm run circuit:pulse-map
export const PULSE_CIRCUIT_OUTLINE_MAP: Record<string, string> = ${JSON.stringify(map, null, 2)};
`;
  await writeFile(outPath, body, 'utf8');
  console.log(`\nWrote ${Object.keys(map).length} mappings → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
