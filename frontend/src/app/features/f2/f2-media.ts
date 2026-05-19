/**
 * Imágenes oficiales F2 2026 (Cloudinary / fiaformula2.com).
 * Fuente: https://www.fiaformula2.com/Teams-and-Drivers
 */

const F2_CLOUD = 'https://res.cloudinary.com/prod-f2f3/image/upload';

/** Tarjetas: carga rápida, busto completo (sin g_face ni background removal). */
const portraitCard = (versionPath: string): string =>
  `${F2_CLOUD}/c_limit,w_520,h_720,q_auto:good,f_auto/${versionPath}`;

/** Perfil / clasificación: un poco más de resolución. */
const portraitLarge = (versionPath: string): string =>
  `${F2_CLOUD}/c_limit,w_640,h_880,q_auto:good,f_auto/${versionPath}`;

/** Fallback sin transformación (por si falla la URL optimizada). */
const portraitRaw = (versionPath: string): string =>
  `${F2_CLOUD}/q_auto:eco,f_auto/${versionPath}`;

const logo = (versionPath: string): string =>
  `${F2_CLOUD}/c_fit,h_320,w_640,q_auto,f_auto/${versionPath}`;

const car = (versionPath: string): string =>
  `${F2_CLOUD}/c_fit,h_520,w_1200,q_auto,f_auto/${versionPath}`;

const PORTRAIT_PATH: Record<string, string> = {
  camara: 'v1771500490/f2/global/articles/2026/02_February/Driver%20Portraits/01_Camara.jpg',
  durksen: 'v1771500492/f2/global/articles/2026/02_February/Driver%20Portraits/02_Duerksen.jpg',
  miyata: 'v1771500509/f2/global/articles/2026/02_February/Driver%20Portraits/03_Miyata.jpg',
  herta: 'v1771500494/f2/global/articles/2026/02_February/Driver%20Portraits/04_Herta.jpg',
  leon: 'v1771500927/f2/global/articles/2026/02_February/Driver%20Portraits/05_Leon.jpg',
  tsolov: 'v1771500928/f2/global/articles/2026/02_February/Driver%20Portraits/06_Tsolov.jpg',
  beganovic: 'v1771500493/f2/global/articles/2026/02_February/Driver%20Portraits/07_Beganovic.jpg',
  bilinski: 'v1771500492/f2/global/articles/2026/02_February/Driver%20Portraits/08_Bilinski.jpg',
  mini: 'v1771500495/f2/global/articles/2026/02_February/Driver%20Portraits/09_Mini.jpg',
  goethe: 'v1771500498/f2/global/articles/2026/02_February/Driver%20Portraits/10_Goethe.jpg',
  montoya: 'v1771500499/f2/global/articles/2026/02_February/Driver%20Portraits/11_Montoya.jpg',
  boya: 'v1771501277/f2/global/articles/2026/02_February/Driver%20Portraits/12_Boya.jpg',
  stenshorne: 'v1771500503/f2/global/articles/2026/02_February/Driver%20Portraits/14_Stenshorne.jpg',
  dunne: 'v1771500504/f2/global/articles/2026/02_February/Driver%20Portraits/15_Dunne.jpg',
  maini: 'v1771500504/f2/global/articles/2026/02_February/Driver%20Portraits/16_Maini.jpg',
  inthraphuvasak: 'v1771500504/f2/global/articles/2026/02_February/Driver%20Portraits/17_Inthraphuvasak.jpg',
  fittipaldi: 'v1771500504/f2/global/articles/2026/02_February/Driver%20Portraits/20_Fittipaldi.jpg',
  shields: 'v1771500507/f2/global/articles/2026/02_February/Driver%20Portraits/21_Shields.jpg',
  varrone: 'v1771500509/f2/global/articles/2026/02_February/Driver%20Portraits/22_Varrone.jpg',
  villagomez: 'v1771500508/f2/global/articles/2026/02_February/Driver%20Portraits/23_Villagomez.jpg',
  van_hoepen: 'v1771500498/f2/global/articles/2026/02_February/Driver%20Portraits/24_Van_Hoepen.jpg',
  bennett: 'v1771500497/f2/global/articles/2026/02_February/Driver%20Portraits/25_Bennett.jpg',
};

/** @type {Record<string, string>} */
export const F2_DRIVER_HEADSHOT_URL: Record<string, string> = Object.fromEntries(
  Object.entries(PORTRAIT_PATH).map(([id, path]) => [id, portraitCard(path)]),
);

/** @type {Record<string, string>} */
export const F2_DRIVER_HEADSHOT_RAW_URL: Record<string, string> = Object.fromEntries(
  Object.entries(PORTRAIT_PATH).map(([id, path]) => [id, portraitRaw(path)]),
);

/** @type {Record<string, string>} */
export const F2_DRIVER_HEADSHOT_LARGE_URL: Record<string, string> = Object.fromEntries(
  Object.entries(PORTRAIT_PATH).map(([id, path]) => [id, portraitLarge(path)]),
);

/** @type {Record<string, string>} */
export const F2_TEAM_LOGO_URL: Record<string, string> = {
  art: logo('v1583181795/f2/global/teams/2019/Team-Logo_ART.png'),
  prema: logo('v1583181799/f2/global/teams/2019/Team-Logo_PREMA.png'),
  trident: logo('v1583181799/f2/global/teams/2019/Team-Logo_Trident.png'),
  van_amersfoort: logo('v1641054871/f2/global/teams/logos/Team-Logo_VAR.png'),
  campos: logo('v1641289263/f2/global/teams/logos/Team-Logo_Campos.png'),
  mp_motorsport: logo('v1646052400/f2/global/teams/logos/Team-Logo_MPMotorsport022.png'),
  rodin: logo('v1704797929/f2/global/teams/logos/Team-Logo_RodinMotorsport.png'),
  dams: logo('v1705935667/f2/global/teams/logos/Team-Logo_DAMS_LucasOil-024.png'),
  invicta: logo('v1709139290/f2/global/teams/logos/Team-Logo_VirtuosiRacing_2.png'),
  aix: logo('v1715586799/f2/global/teams/logos/Team-Logo_AIXRacing.png'),
  hitech: logo('v1736260376/f2/global/teams/logos/Team-Logo_Hitech024.png'),
};

/** @type {Record<string, string>} */
export const F2_TEAM_CAR_URL: Record<string, string> = {
  invicta: car('v1771604232/f2/global/Cars/2026/02Invicta_026_1500k-00T.png'),
  hitech: car('v1771604233/f2/global/Cars/2026/04Hitech_026_1500k-00T.png'),
  campos: car('v1771604233/f2/global/Cars/2026/05Campos_026_1500k-00T.png'),
  dams: car('v1771604233/f2/global/Cars/2026/07DAMS_026_1500k-00T.png'),
  mp_motorsport: car('v1771604234/f2/global/Cars/2026/10MP_026_1500k-00T.png'),
  prema: car('v1771604234/f2/global/Cars/2026/11PREMA_026_1500k-00T.png'),
  rodin: car('v1771604234/f2/global/Cars/2026/14Rodin_026_1500k-00T.png'),
  art: car('v1771604236/f2/global/Cars/2026/17ART_026_1500k-00T.png'),
  aix: car('v1771604236/f2/global/Cars/2026/21AIX_026_1500k-00T.png'),
  van_amersfoort: car('v1771604236/f2/global/Cars/2026/23VAR_026_1500k-00T.png'),
  trident: car('v1771604236/f2/global/Cars/2026/24Trident_026_1500k-00T.png'),
};

export function f2DriverHeadshotUrl(driverId: string, size: 'card' | 'large' = 'card'): string | null {
  const id = (driverId || '').trim().toLowerCase();
  if (!id) return null;
  if (size === 'large') return F2_DRIVER_HEADSHOT_LARGE_URL[id] ?? null;
  return F2_DRIVER_HEADSHOT_URL[id] ?? null;
}

export function f2DriverHeadshotRawUrl(driverId: string): string | null {
  const id = (driverId || '').trim().toLowerCase();
  return id ? (F2_DRIVER_HEADSHOT_RAW_URL[id] ?? null) : null;
}

export function f2TeamLogoUrl(constructorId: string): string | null {
  const id = (constructorId || '').trim().toLowerCase();
  return id ? (F2_TEAM_LOGO_URL[id] ?? null) : null;
}

export function f2TeamCarImageUrl(constructorId: string): string | null {
  const id = (constructorId || '').trim().toLowerCase();
  return id ? (F2_TEAM_CAR_URL[id] ?? null) : null;
}
