/**
 * Imágenes oficiales F3 2026 (Cloudinary prod-f2f3 / fiaformula3.com).
 * Fuente: https://www.fiaformula3.com/Teams-and-Drivers
 */

const F3_CLOUD = 'https://res.cloudinary.com/prod-f2f3/image/upload';

/** Tarjetas: imagen completa; el CSS de la card usa object-fit: contain. */
const portraitCard = (versionPath: string): string =>
  `${F3_CLOUD}/c_limit,w_560,h_720,q_auto:good,f_auto/${versionPath}`;

/** Clasificación / marco pequeño: recorte al sujeto. */
const portraitLarge = (versionPath: string): string =>
  `${F3_CLOUD}/c_fill,w_520,h_700,g_auto:subject,q_auto:good,f_auto/${versionPath}`;

const portraitRaw = (versionPath: string): string =>
  `${F3_CLOUD}/q_auto:eco,f_auto/${versionPath}`;

const logo = (versionPath: string): string =>
  `${F3_CLOUD}/c_fit,h_320,w_640,q_auto,f_auto/${versionPath}`;

const car = (versionPath: string): string =>
  `${F3_CLOUD}/c_fit,h_520,w_1200,q_auto,f_auto/${versionPath}`;

const PORTRAIT_PATH: Record<string, string> = {
  nael: 'v1/f3/global/drivers/2026/Portraits/01_Nael',
  ugochukwu: 'v1/f3/global/drivers/2026/Portraits/02_Ugo',
  stromsted: 'v1/f3/global/drivers/2026/Portraits/03_Stromsted',
  slater: 'v1/f3/global/drivers/2026/Portraits/05_Slater',
  de_palo: 'v1/f3/global/drivers/2026/Portraits/06_De_Palo',
  colnaghi: 'v1/f3/global/drivers/2026/Portraits/07_Colnaghi',
  taponen: 'v1/f3/global/drivers/2026/Portraits/08_Taponen',
  giusti: 'v1/f3/global/drivers/2026/Portraits/DSC_4516_WmpZjXMZb',
  kato: 'v1/f3/global/drivers/2026/Portraits/10_Kato',
  gladysz: 'v1/f3/global/drivers/2026/Portraits/11_Gladysz',
  le: 'v1/f3/global/drivers/2026/Portraits/12_Le',
  yamakoshi: 'v1/f3/global/drivers/2026/Portraits/14_Yamakoshi',
  deligny: 'v1/f3/global/drivers/2026/Portraits/15_Deligny',
  del_pino: 'v1/f3/global/drivers/2026/Portraits/16_Del_Pino',
  clerot: 'v1/f3/global/drivers/2026/Portraits/17_Clerot',
  badoer: 'v1/f3/global/drivers/2026/Portraits/18_Badoer',
  ho: 'v1/f3/global/drivers/2026/Portraits/19_Ho',
  sharp: 'v1/f3/global/drivers/2026/Portraits/20_Sharp',
  wharton: 'v1/f3/global/drivers/2026/Portraits/21_Wharton',
  garfias: 'v1/f3/global/drivers/2026/PreSeason/Garfias_Web026',
  shin: 'v1/f3/global/drivers/2026/PreSeason/Shin_Web026',
  mclaughlin: 'v1/f3/global/drivers/2026/Portraits/24_McLaughlin',
  nakamura: 'v1/f3/global/drivers/2026/Portraits/25_Nakamura',
  benavides: 'v1/f3/global/drivers/2026/Portraits/26_Benavides',
  david: 'v1/f3/global/drivers/2026/Portraits/27_David',
  barrichello: 'v1/f3/global/drivers/2026/Portraits/28_Barrichello',
  lacorte: 'v1/f3/global/drivers/2026/Portraits/29_Lacorte',
  bhirombhakdi: 'v1/f3/global/drivers/2026/Portraits/30_Bhirombhakdi',
  xie: 'v1/f3/global/drivers/2026/Portraits/31_Xie',
};

export const F3_DRIVER_HEADSHOT_URL: Record<string, string> = Object.fromEntries(
  Object.entries(PORTRAIT_PATH).map(([id, path]) => [id, portraitCard(path)]),
);

export const F3_DRIVER_HEADSHOT_RAW_URL: Record<string, string> = Object.fromEntries(
  Object.entries(PORTRAIT_PATH).map(([id, path]) => [id, portraitRaw(path)]),
);

export const F3_DRIVER_HEADSHOT_LARGE_URL: Record<string, string> = Object.fromEntries(
  Object.entries(PORTRAIT_PATH).map(([id, path]) => [id, portraitLarge(path)]),
);

export const F3_TEAM_LOGO_URL: Record<string, string> = {
  art: logo('v1/f3/global/teams/logos/Team-Logo_ART'),
  prema: logo('v1/f3/global/teams/logos/Team-Logo_PREMA'),
  trident: logo('v1/f3/global/teams/logos/Team-Logo_Trident'),
  van_amersfoort: logo('v1/f3/global/teams/logos/Team-Logo_VAR'),
  campos: logo('v1/f3/global/teams/logos/Team-Logo_Campos'),
  mp_motorsport: logo('v1/f3/global/teams/logos/Team-Logo_MPMotorsport022'),
  rodin: logo('v1/f3/global/teams/logos/Team-Logo_RodinMotorsport'),
  aix: logo('v1/f3/global/teams/logos/Team-Logo_AIXRacing'),
  dams: logo('v1705935667/f2/global/teams/logos/Team-Logo_DAMS_LucasOil-024.png'),
  hitech: logo('v1736260376/f2/global/teams/logos/Team-Logo_Hitech024.png'),
};

export const F3_TEAM_CAR_URL: Record<string, string> = {
  campos: car('v1/f3/global/cars/2026/01Campos_026F3_1500k-00T'),
  trident: car('v1/f3/global/cars/2026/05TRIDENT_026F3_1500k-00T'),
  mp_motorsport: car('v1/f3/global/cars/2026/08MP_026F3_1500k-00T'),
  art: car('v1/f3/global/cars/2026/10ART_026F3_1500k-00T'),
  van_amersfoort: car('v1/f3/global/cars/2026/14VAR_026F3_1500k-00T'),
  rodin: car('v1/f3/global/cars/2026/18Rodin_026F3_1500k-00T'),
  prema: car('v1/f3/global/cars/2026/22PREMA_026F3_1500k-00T'),
  hitech: car('v1/f3/global/cars/2026/25Hitech_026F3_1500k-00T'),
  aix: car('v1/f3/global/cars/2026/26AIX_026F3_1500k-00T'),
  dams: car('v1/f3/global/cars/2026/29DAMS_026F3_1500k-06'),
};

export function f3DriverHeadshotUrl(driverId: string, size: 'card' | 'large' = 'card'): string | null {
  const id = (driverId || '').trim().toLowerCase();
  if (!id) return null;
  if (size === 'large') return F3_DRIVER_HEADSHOT_LARGE_URL[id] ?? null;
  return F3_DRIVER_HEADSHOT_URL[id] ?? null;
}

export function f3DriverHeadshotRawUrl(driverId: string): string | null {
  const id = (driverId || '').trim().toLowerCase();
  return id ? (F3_DRIVER_HEADSHOT_RAW_URL[id] ?? null) : null;
}

export function f3TeamLogoUrl(constructorId: string): string | null {
  const id = (constructorId || '').trim().toLowerCase();
  return id ? (F3_TEAM_LOGO_URL[id] ?? null) : null;
}

export function f3TeamCarImageUrl(constructorId: string): string | null {
  const id = (constructorId || '').trim().toLowerCase();
  return id ? (F3_TEAM_CAR_URL[id] ?? null) : null;
}
