import { BACINGER_OUTLINES } from './bacinger-outlines.generated';
import { PULSE_CIRCUIT_OUTLINE_MAP } from './pulse-circuit-outline-map.generated';
import { OFFICIAL_CIRCUITS, type OfficialCircuit } from './official-circuits';

export interface RaceCircuitFields {
  circuitId?: string | null;
  circuitName?: string | null;
  locality?: string | null;
  country?: string | null;
}

const outlineById = new Map<string, OfficialCircuit>();
for (const c of [...OFFICIAL_CIRCUITS, ...BACINGER_OUTLINES]) {
  if (!outlineById.has(c.id)) outlineById.set(c.id, c);
}
const ALL_OUTLINES = [...outlineById.values()];

/** Solo alias verificados → id bacinger/OSM (evita Paul Ricard en Le Mans, Zandvoort en Assen, etc.). */
const OUTLINE_ID_ALIASES: Record<string, string> = {
  'circuit of the americas': 'us-2012',
  cota: 'us-2012',
  austin: 'us-2012',
  'circuit de barcelona catalunya': 'es-1991',
  catalunya: 'es-1991',
  barcelona: 'es-1991',
  montmelo: 'es-1991',
  mugello: 'it-1914',
  'autodromo internazionale del mugello': 'it-1914',
  'scarperia e san piero': 'it-1914',
  hungaroring: 'hu-1986',
  balatonfokajar: 'hu-1986',
  'red bull ring': 'at-1969',
  spielberg: 'at-1969',
  silverstone: 'gb-1948',
  sepang: 'my-1999',
  'sepang international': 'my-1999',
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
  'sao paulo': 'br-1940',
  // MotoGP — trazados OSM verificados (no Pulse / no Paul Ricard en Le Mans)
  assen: 'osm-assen',
  'tt circuit assen': 'osm-assen',
  jerez: 'osm-jerez',
  'circuito de jerez': 'osm-jerez',
  'angel nieto': 'osm-jerez',
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
  'circuit bugatti': 'osm-bugatti',
  'le mans': 'osm-bugatti',
  valencia: 'osm-valencia',
  'ricardo tormo': 'osm-valencia',
  cheste: 'osm-valencia',
  aragon: 'osm-aragon',
  'motorland aragon': 'osm-aragon',
  alcaniz: 'osm-aragon',
  misano: 'it-1953',
  'misano world circuit': 'it-1953',
  'marco simoncelli': 'it-1953',
};

const stripAccents = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '');

const normalize = (s: string): string =>
  stripAccents(s.toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim();

function outlineByOutlineId(outlineId: string): OfficialCircuit | null {
  return outlineById.get(outlineId) ?? null;
}

function findInCatalog(query: string): OfficialCircuit | null {
  const q = normalize(
    query
      .replace(/\bgrand prix\b/gi, ' ')
      .replace(/\bgran premio\b/gi, ' ')
      .replace(/\bof\b/g, ' ')
      .replace(/\bde\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
  if (!q || q.length < 3) return null;

  const aliasId = OUTLINE_ID_ALIASES[q];
  if (aliasId) return outlineByOutlineId(aliasId);

  for (const [alias, id] of Object.entries(OUTLINE_ID_ALIASES)) {
    if (alias.length < 4 || q.length < 4) continue;
    if (q.includes(alias) || alias.includes(q)) return outlineByOutlineId(id);
  }

  for (const c of ALL_OUTLINES) {
    const n = normalize(c.name);
    const l = normalize(c.location);
    if (n === q || l === q) return c;
    if (q.length >= 8 && (n.includes(q) || l.includes(q))) {
      if (c.id === 'be-1925' && !/\bspa\b|francorchamps/.test(q)) continue;
      return c;
    }
  }

  return null;
}

/** Trazado GPS por nombre/localidad (genérico). */
export function findCircuitOutline(
  circuitName?: string | null,
  locality?: string | null,
): OfficialCircuit | null {
  for (const q of [circuitName, locality]) {
    const hit = q ? findInCatalog(q) : null;
    if (hit) return hit;
  }
  return null;
}

/** Resuelve el trazado usando el objeto race del calendario (circuitId + nombres del circuito). */
export function findCircuitOutlineForRace(race: RaceCircuitFields): OfficialCircuit | null {
  const pulseId = String(race.circuitId ?? '').trim();
  if (pulseId) {
    const mapped = PULSE_CIRCUIT_OUTLINE_MAP[pulseId];
    if (mapped) {
      const hit = outlineByOutlineId(mapped);
      if (hit) return hit;
    }
  }

  for (const q of [race.circuitName, race.locality]) {
    const hit = q ? findInCatalog(q) : null;
    if (hit) return hit;
  }

  return null;
}

export function hasVerifiedCircuitOutline(
  circuitName?: string | null,
  locality?: string | null,
): boolean {
  return Boolean(findCircuitOutline(circuitName, locality));
}

export function hasVerifiedCircuitOutlineForRace(race: RaceCircuitFields): boolean {
  return Boolean(findCircuitOutlineForRace(race));
}
