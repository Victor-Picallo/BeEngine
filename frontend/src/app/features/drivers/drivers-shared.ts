import type { SeriesId } from '../../core/series/series.types';
import type { JolpikaDriverStanding, OpenF1Driver } from '../f1-live/f1-live.types';
import { moto2DriverHeadshotUrl } from '../moto2/moto2-media';
import { moto3DriverHeadshotUrl } from '../moto3/moto3-media';

export const ACCENT = '#FFD100';

/** F2/F3 usan retratos FIA de cuerpo entero (mismo tratamiento CSS). */
export function isFeederPortraitSeries(sid: SeriesId | string | null | undefined): boolean {
  return sid === 'f2' || sid === 'f3';
}

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
  /* MotoGP 2026 — equipos / fabricantes */
  ducati: '#CC0000',
  aprilia: '#006B3C',
  ktm: '#FF6600',
  yamaha: '#003087',
  honda: '#E60012',
  gresini: '#00AEEF',
  vr46: '#FFD100',
  lcr: '#E31937',
  pramac: '#003DA5',
  'pertamina enduro vr46': '#FFD100',
  'pertamina enduro vr46 racing team': '#FFD100',
  'ducati lenovo': '#CC0000',
  'ducati lenovo team': '#CC0000',
  'red bull ktm': '#FF6600',
  'red bull ktm factory racing': '#FF6600',
  'red bull ktm tech3': '#FF6600',
  'trackhouse racing': '#1E2A5A',
  'trackhouse motogp team': '#1E2A5A',
  'aprilia racing': '#006B3C',
  'honda hrc castrol': '#E60012',
  'monster energy yamaha motogp': '#003087',
  'monster energy yamaha': '#003087',
  'prima pramac yamaha motogp': '#003DA5',
  'prima pramac yamaha': '#003DA5',
  'bk8 gresini racing motogp': '#00AEEF',
  'gresini racing motogp': '#00AEEF',
  'castrol honda lcr': '#E31937',
  'lcr honda': '#E31937',
};

/** Claves ordenadas de más larga a más corta para resolver por substring (MotoGP, etc.). */
const TEAM_COLOR_KEYS = Object.keys(TEAM_COLORS).sort((a, b) => b.length - a.length);

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

/** Ergast driverId (slug) para un piloto OpenF1, cruzando con standings Jolpica. */
export function jolpikaDriverIdForOpenF1(
  driver: OpenF1Driver,
  standings: JolpikaDriverStanding[],
): string | null {
  if (!standings.length) return null;
  const jn = normalize(driver.fullName);
  const jTeam = normalize(driver.teamName);
  const jLast = jn.split(/\s+/).pop() ?? '';

  const exact = standings.find((j) => normalize(j.driver) === jn);
  if (exact?.driverId && exact.driverId !== 'unknown') return exact.driverId;

  const fuzzy = standings.find((j) => {
    const last = normalize(j.driver).split(/\s+/).pop() ?? '';
    return last === jLast && normalize(j.team) === jTeam;
  });
  if (fuzzy?.driverId && fuzzy.driverId !== 'unknown') return fuzzy.driverId;
  return null;
}

/** Color de equipo; si la API envía hex (MotoGP), ese valor tiene prioridad. */
export const teamColor = (team: string, apiColor?: string | null): string => {
  const hex = (apiColor && String(apiColor).trim()) || '';
  if (/^#[0-9a-f]{3,8}$/i.test(hex)) return hex;
  const n = normalize(team);
  if (!n) return '#888888';
  if (TEAM_COLORS[n]) return TEAM_COLORS[n];
  for (const key of TEAM_COLOR_KEYS) {
    if (n.includes(key)) return TEAM_COLORS[key];
  }
  return '#888888';
};

/** OpenF1 headshot URL upgraded to 8col when possible. */
export function hiResF1HeadshotUrl(url: string): string {
  if (!url || !url.includes('.transform/')) return url;
  return url.replace(/\.transform\/\d+col\//, '.transform/8col/');
}

/** Retrato desde el API (Supabase / OpenF1 / Pulse). Sin mapas CDN en el cliente. */
export function resolveDriverHeadshotUrl(
  _driverId: string,
  _driverFullName: string | undefined,
  apiHeadshotUrl: string | undefined | null,
  options?: { size?: 'card' | 'large'; seriesId?: SeriesId },
): string {
  const apiUrl = (apiHeadshotUrl && String(apiHeadshotUrl).trim()) || '';
  if (!apiUrl) return '';

  const sid = options?.seriesId;
  if (sid === 'moto2') return moto2DriverHeadshotUrl(_driverId, apiHeadshotUrl) ?? '';
  if (sid === 'moto3') return moto3DriverHeadshotUrl(_driverId, apiHeadshotUrl) ?? '';
  if (sid === 'f1' || !sid) return hiResF1HeadshotUrl(apiUrl);
  return apiUrl;
}

/** Fallback secundario en `<img>`: misma URL que el API (sin transform local). */
export function resolveDriverHeadshotRawUrl(
  _driverId: string,
  _seriesId?: SeriesId,
  apiHeadshotUrl?: string | null,
): string {
  return (apiHeadshotUrl && String(apiHeadshotUrl).trim()) || '';
}

export function flagCdnUrl(alpha2: string): string {
  const cc = alpha2.trim().toUpperCase();
  if (cc.length !== 2 || !/^[A-Z]{2}$/.test(cc)) return '';
  return `https://flagcdn.com/w40/${cc.toLowerCase()}.png`;
}

/** Cruce standings ↔ OpenF1 (mismo criterio que la página de pilotos). */
export function matchOpenF1Driver(
  j: JolpikaDriverStanding,
  open: OpenF1Driver[],
): OpenF1Driver | undefined {
  if (!open.length) return undefined;
  const jn = normalize(j.driver);
  const jTeam = normalize(j.team);
  const jLast = jn.split(/\s+/).pop() ?? '';

  const exact = open.find((o) => normalize(o.fullName) === jn);
  if (exact) return exact;

  return open.find((o) => {
    const fn = normalize(o.fullName);
    const parts = fn.split(/\s+/);
    const oLast = parts[parts.length - 1] ?? '';
    return oLast === jLast && normalize(o.teamName) === jTeam;
  });
}

export interface AuthDriverPickerOption {
  driverId: string;
  driver: string;
  team: string;
  teamColor: string;
  headshotUrl: string;
  /** Dorsal (OpenF1 en F1); null si no hay fuente fiable. */
  number: number | null;
}

export function driverDisplayInitials(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function buildAuthDriverPickerOptions(
  rows: JolpikaDriverStanding[],
  open: OpenF1Driver[],
  seriesId: SeriesId,
): AuthDriverPickerOption[] {
  return rows.map((j) => {
    const o = matchOpenF1Driver(j, open);
    const headshotUrl = resolveDriverHeadshotUrl(
      j.driverId ?? '',
      j.driver,
      j.headshotUrl ?? o?.headshotUrl,
      { size: 'card', seriesId },
    );
    return {
      driverId: j.driverId,
      driver: j.driver,
      team: j.team,
      teamColor: teamColor(j.team, j.teamColor ?? o?.teamColour),
      headshotUrl,
      number: o?.driverNumber ?? null,
    };
  });
}
