/**
 * SVG de circuitos F1/F2/F3 (ergast circuitId → coggs/f1_svg, URLs verificadas).
 * @see https://github.com/coggs/f1_svg
 */

const COGGS_SVG_BASE = 'https://raw.githubusercontent.com/coggs/f1_svg/main';

/** @type {Record<string, string>} ergast circuitId → nombre de fichero en coggs/f1_svg */
export const ERGAST_COGGS_SVG_FILE = {
  albert_park: 'Melbourne.svg',
  austin: 'Texas.svg',
  bahrain: 'Sakhir%20(Bahrain).svg',
  baku: 'Baku%20(Azerbaijan).svg',
  catalunya: 'Catalunya.svg',
  hungaroring: 'Hungaroring.svg',
  imola: 'Imola.svg',
  interlagos: 'Brazil.svg',
  jeddah: 'Jeddah.svg',
  losail: 'Losail.svg',
  'las-vegas': 'Las%20Vegas.svg',
  vegas: 'Las%20Vegas.svg',
  madring: 'Catalunya.svg',
  marina_bay: 'Singapore.svg',
  miami: 'Miami.svg',
  monaco: 'Monaco.svg',
  monza: 'Monza.svg',
  portimao: 'Portimao.svg',
  red_bull_ring: 'Austria.svg',
  ricard: 'Paul%20Ricard.svg',
  rodriguez: 'Mexico.svg',
  shanghai: 'Shanghai.svg',
  silverstone: 'Silverstone.svg',
  spa: 'Spa.svg',
  suzuka: 'Suzuka.svg',
  villeneuve: 'Montreal.svg',
  yas_marina: 'Abu%20Dhabi.svg',
  zandvoort: 'Zandvoort.svg',
};

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Alias de nombres FIA/Jolpica → ergast circuitId */
const NAME_TO_ERGAST = {
  bahrain: 'bahrain',
  sakhir: 'bahrain',
  jeddah: 'jeddah',
  melbourne: 'albert_park',
  'albert park': 'albert_park',
  shanghai: 'shanghai',
  suzuka: 'suzuka',
  miami: 'miami',
  imola: 'imola',
  monaco: 'monaco',
  'monte carlo': 'monaco',
  montreal: 'villeneuve',
  'gilles villeneuve': 'villeneuve',
  barcelona: 'catalunya',
  catalunya: 'catalunya',
  spielberg: 'red_bull_ring',
  'red bull ring': 'red_bull_ring',
  silverstone: 'silverstone',
  spa: 'spa',
  'spa francorchamps': 'spa',
  hungaroring: 'hungaroring',
  zandvoort: 'zandvoort',
  monza: 'monza',
  baku: 'baku',
  singapore: 'marina_bay',
  'marina bay': 'marina_bay',
  austin: 'austin',
  'circuit of the americas': 'austin',
  'mexico city': 'rodriguez',
  'rodriguez': 'rodriguez',
  'sao paulo': 'interlagos',
  interlagos: 'interlagos',
  'las vegas': 'vegas',
  vegas: 'vegas',
  lusail: 'losail',
  qatar: 'losail',
  'abu dhabi': 'yas_marina',
  'yas marina': 'yas_marina',
  madrid: 'madring',
  madring: 'madring',
  jerez: 'portimao',
  'paul ricard': 'ricard',
  'le castellet': 'ricard',
  portimao: 'portimao',
};

export function resolveErgastId(row) {
  const id = (row.circuitId ?? '').trim().toLowerCase();
  if (id && ERGAST_COGGS_SVG_FILE[id]) return id;

  const keys = [row.circuitName, row.raceName, row.locality, row.country]
    .map(norm)
    .filter(Boolean);

  for (const k of keys) {
    if (NAME_TO_ERGAST[k]) return NAME_TO_ERGAST[k];
    for (const [alias, ergast] of Object.entries(NAME_TO_ERGAST)) {
      if (k.includes(alias) || alias.includes(k)) return ergast;
    }
  }
  return id || null;
}

export function coggsSvgUrlForErgastId(ergastId) {
  const file = ERGAST_COGGS_SVG_FILE[ergastId];
  if (!file) return null;
  return `${COGGS_SVG_BASE}/${file}`;
}

/**
 * @param {object} row
 * @returns {{ circuitId?: string, circuitSvgUrl?: string, circuitImageUrl?: string } | null}
 */
export function resolveFormulaCircuitAssets(row) {
  const ergastId = resolveErgastId(row);
  if (!ergastId) return null;

  const svgUrl = coggsSvgUrlForErgastId(ergastId);
  if (!svgUrl) return null;

  return {
    circuitId: row.circuitId ?? ergastId,
    circuitSvgUrl: svgUrl,
    circuitImageUrl: row.circuitImageUrl ?? svgUrl,
  };
}
