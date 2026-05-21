import type { SeriesId } from '../../core/series/series.types';
import type { JolpikaDriverStanding, OpenF1Driver } from '../f1-live/f1-live.types';
import { f2DriverHeadshotRawUrl, f2DriverHeadshotUrl } from '../f2/f2-media';
import { f3DriverHeadshotRawUrl, f3DriverHeadshotUrl } from '../f3/f3-media';

export const ACCENT = '#FFD100';

export const TEAM_COLORS: Record<string, string> = {
  mercedes: '#27F4D2',
  'red bull': '#3671C6',
  'red bull racing': '#3671C6',
  ferrari: '#E8002D',
  mclaren: '#FF8000',
  'aston martin': '#358C75',
  alpine: '#0093CC',
  'alpine f1 team': '#0093CC',
  williams: '#64C4FF',
  haas: '#B6BABD',
  'haas f1 team': '#B6BABD',
  rb: '#6692FF',
  'rb f1 team': '#6692FF',
  'racing bulls': '#6692FF',
  'kick sauber': '#52E252',
  sauber: '#52E252',
  audi: '#E5002B',
  'audi revolut f1 team': '#E5002B',
  'cadillac f1 team': '#C0C0C0',
  cadillac: '#C0C0C0',
  /* F2 2026 */
  'campos racing': '#FF6B00',
  campos: '#FF6B00',
  'invicta racing': '#E31937',
  invicta: '#E31937',
  'mp motorsport': '#0090FF',
  hitech: '#5B4FCF',
  trident: '#003DA5',
  'art grand prix': '#E8002D',
  art: '#E8002D',
  'dams lucas oil': '#FFD100',
  dams: '#FFD100',
  'rodin motorsport': '#111111',
  rodin: '#111111',
  'prema racing': '#E8002D',
  prema: '#E8002D',
  'van amersfoort racing': '#FF4500',
  'aix racing': '#00A651',
  aix: '#00A651',
};

const NATIONALITY_TO_CC: Record<string, string> = {
  British: 'GB',
  Dutch: 'NL',
  Spanish: 'ES',
  Monegasque: 'MC',
  Australian: 'AU',
  French: 'FR',
  Italian: 'IT',
  Mexican: 'MX',
  Japanese: 'JP',
  Thai: 'TH',
  Canadian: 'CA',
  German: 'DE',
  Finnish: 'FI',
  Danish: 'DK',
  Chinese: 'CN',
  American: 'US',
  'New Zealander': 'NZ',
  Argentine: 'AR',
  Brazilian: 'BR',
  Austrian: 'AT',
  Swiss: 'CH',
  Swedish: 'SE',
  Irish: 'IE',
  Russian: 'RU',
  Indian: 'IN',
  'South African': 'ZA',
  Bulgarian: 'BG',
  Paraguayan: 'PY',
  Polish: 'PL',
  Norwegian: 'NO',
  Colombian: 'CO',
  'South Korean': 'KR',
  'Sri Lankan': 'LK',
  Singaporean: 'SG',
};

/** ISO 3166-1 alpha-2 → alpha-3 (F1 grid + extras). */
const ALPHA2_TO_ALPHA3: Record<string, string> = {
  GB: 'GBR',
  NL: 'NLD',
  ES: 'ESP',
  MC: 'MCO',
  AU: 'AUS',
  FR: 'FRA',
  IT: 'ITA',
  MX: 'MEX',
  JP: 'JPN',
  TH: 'THA',
  CA: 'CAN',
  DE: 'DEU',
  FI: 'FIN',
  DK: 'DNK',
  CN: 'CHN',
  US: 'USA',
  NZ: 'NZL',
  AR: 'ARG',
  BR: 'BRA',
  AT: 'AUT',
  CH: 'CHE',
  SE: 'SWE',
  IE: 'IRL',
  RU: 'RUS',
  IN: 'IND',
  ZA: 'ZAF',
  PL: 'POL',
  SI: 'SVN',
  BE: 'BEL',
  PT: 'PRT',
  HU: 'HUN',
  UA: 'UKR',
  CO: 'COL',
  VE: 'VEN',
  SA: 'SAU',
  KR: 'KOR',
  NO: 'NOR',
  CZ: 'CZE',
  RO: 'ROU',
  BG: 'BGR',
  PY: 'PRY',
  HR: 'HRV',
  RS: 'SRB',
};

export function countryCodesForDriver(
  j: JolpikaDriverStanding,
  o: OpenF1Driver | undefined,
): { alpha2: string; alpha3: string } {
  const fromOpen = o?.countryCode?.trim().toUpperCase() ?? '';
  const fromJol = NATIONALITY_TO_CC[j.nationality] ?? '';
  const alpha2 =
    fromOpen.length === 2 && /^[A-Z]{2}$/.test(fromOpen) ? fromOpen : fromJol;
  const alpha3 = alpha2 ? ALPHA2_TO_ALPHA3[alpha2] ?? '' : '';
  return { alpha2, alpha3 };
}

/** Flag codes from Ergast nationality label (constructors, etc.). */
export function countryCodesFromNationality(nationality: string): { alpha2: string; alpha3: string } {
  const alpha2 = NATIONALITY_TO_CC[nationality] ?? '';
  const alpha3 = alpha2 ? ALPHA2_TO_ALPHA3[alpha2] ?? '' : '';
  return { alpha2, alpha3 };
}

export const normalize = (s: string): string =>
  (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const teamColor = (team: string): string =>
  TEAM_COLORS[normalize(team)] ?? '#888888';

/** OpenF1 headshot URL upgraded to 8col when possible. */
export function hiResF1HeadshotUrl(url: string): string {
  if (!url || !url.includes('.transform/')) return url;
  return url.replace(/\.transform\/\d+col\//, '.transform/8col/');
}

/**
 * Retrato en `media.formula1.com` cuando OpenF1 aún no expone `headshotUrl`
 * (misma ruta que precarga la web oficial).
 *
 * Ergast usa `driverId` **arvid_lindblad** (no `lindblad`); por eso varias claves
 * y un fallback por nombre normalizado.
 *
 * El asset `…arvlin01right.webp` es **cuerpo entero**; OpenF1 usa bustos. Cloudinary
 * `c_thumb` + `g_face` recorta en torno a la cara para alinear el encuadre con el resto.
 */
const ARVID_LINDBLAD_HEADSHOT =
  'https://media.formula1.com/image/upload/c_thumb,w_720,h_900,g_face,q_auto,f_auto/f_auto/q_auto/v1740000001/common/f1/2026/racingbulls/arvlin01/2026racingbullsarvlin01right.webp';

const F1_OFFICIAL_HEADSHOT_BY_DRIVER_ID: Record<string, string> = {
  lindblad: ARVID_LINDBLAD_HEADSHOT,
  arvid_lindblad: ARVID_LINDBLAD_HEADSHOT,
};

export function f1OfficialHeadshotWhenOpenF1Missing(
  driverId: string,
  driverFullName?: string,
): string | null {
  const id = (driverId || '').trim().toLowerCase();
  const byId = id ? F1_OFFICIAL_HEADSHOT_BY_DRIVER_ID[id] : undefined;
  if (byId) return byId;
  const nn = normalize(driverFullName ?? '');
  if (nn === 'arvid lindblad') return ARVID_LINDBLAD_HEADSHOT;
  return null;
}

/**
 * OpenF1 a veces devuelve un `headshotUrl` genérico o roto; si tenemos retrato
 * oficial en el mapa, ese gana siempre.
 */
export function resolveDriverHeadshotUrl(
  driverId: string,
  driverFullName: string | undefined,
  openF1HeadshotUrl: string | undefined | null,
  options?: { size?: 'card' | 'large'; seriesId?: SeriesId },
): string {
  if (options?.seriesId === 'f2') {
    const f2 = f2DriverHeadshotUrl(driverId, options?.size ?? 'card');
    if (f2) return f2;
  }
  if (options?.seriesId === 'f3') {
    const f3 = f3DriverHeadshotUrl(driverId, options?.size ?? 'card');
    if (f3) return f3;
  }

  const official = f1OfficialHeadshotWhenOpenF1Missing(driverId, driverFullName);
  if (official) return official;
  const raw = (openF1HeadshotUrl && String(openF1HeadshotUrl).trim()) || '';
  return raw ? hiResF1HeadshotUrl(raw) : '';
}

export function resolveDriverHeadshotRawUrl(driverId: string, seriesId?: SeriesId): string {
  if (seriesId === 'f3') return f3DriverHeadshotRawUrl(driverId) ?? '';
  if (seriesId === 'f2') return f2DriverHeadshotRawUrl(driverId) ?? '';
  return '';
}

export function flagCdnUrl(alpha2: string): string {
  const cc = alpha2.trim().toUpperCase();
  if (cc.length !== 2 || !/^[A-Z]{2}$/.test(cc)) return '';
  return `https://flagcdn.com/w40/${cc.toLowerCase()}.png`;
}
