/**
 * Logos y retratos Moto2 (public/moto2/teams + snapshot motogp.com).
 */
import { environment } from '../../../environments/environment';
import { MOTO2_DRIVER_PORTRAIT_URL } from './moto2-portraits.data';

export function moto2AssetOrigin(): string {
  return environment.apiUrl.replace(/\/api\/?$/, '');
}

export function moto2LogoAbsoluteUrl(path: string | null | undefined): string | null {
  const p = (path ?? '').trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith('/moto2/teams/')) return p;
  if (p.startsWith('/')) return `${moto2AssetOrigin()}${p}`;
  return p;
}

const L = (file: string) => `/moto2/teams/${file}`;

const OFFICIAL_FILES: Record<string, string> = {
  'blu-cru-pramac-yamaha-moto2': 'blu-cru-pramac-yamaha-moto2.png',
  'cfmoto-aspar-team': 'cfmoto-aspar-team.png',
  'elf-marc-vds-racing-team': 'elf-marc-vds-racing-team.png',
  'idemitsu-honda-team-asia': 'idemitsu-honda-team-asia.png',
  'italjet-gresini-moto2': 'italjet-gresini-moto2.png',
  'italtrans-racing-team': 'italtrans-racing-team.png',
  'klint-racing-team': 'klint-racing-team.png',
  'liqui-moly-dynavolt-intact-gp': 'liqui-moly-dynavolt-intact-gp.svg',
  'momoven-idrofoglia-rw-racing-team': 'momoven-idrofoglia-rw-racing-team.png',
  'onlyfans-american-racing-team': 'onlyfans-american-racing-team.png',
  'qj-motor-galfer-msi': 'qj-motor-galfer-msi.png',
  'red-bull-ktm-ajo': 'red-bull-ktm-ajo.jpg',
  'reds-fantic-racing': 'reds-fantic-racing.png',
  'speedrs-team': 'speedrs-team.png',
};

const logo = (slug: string) => L(OFFICIAL_FILES[slug]);

const LOGO_BY_TEAM_ID: Record<string, string> = {
  'd4b6a18c-5647-4667-9085-489ca4ff5649': logo('blu-cru-pramac-yamaha-moto2'),
  'e3320217-761f-4bad-88d6-f5467835fefa': logo('cfmoto-aspar-team'),
  '2369c22c-90fb-4d77-8270-4df47c1fdf23': logo('elf-marc-vds-racing-team'),
  'b208e1d8-b4cf-4cb8-a912-0dba179dd7cf': logo('idemitsu-honda-team-asia'),
  '5119ab4e-9d4c-4ecb-b18a-d377cf518506': logo('italjet-gresini-moto2'),
  '100348da-52fa-49e5-aee8-b276282bbaa0': logo('italtrans-racing-team'),
  'd41e19d0-b661-4719-9402-d172e36f419e': logo('klint-racing-team'),
  '57dc8016-70b3-4eea-bec1-7f8f6cdf8609': logo('liqui-moly-dynavolt-intact-gp'),
  '1c011306-8178-4c32-85e8-c7603e43948d': logo('momoven-idrofoglia-rw-racing-team'),
  '30da094b-fd92-4cb2-80c5-04602c67004e': logo('onlyfans-american-racing-team'),
  'e1df9a44-e0f2-4a53-8248-0871270fc60a': logo('qj-motor-galfer-msi'),
  '3c73638c-cffb-4e42-a6ca-b6506ab6bf5c': logo('red-bull-ktm-ajo'),
  '187e0f58-020e-490f-b45d-575e2d6a6ef2': logo('reds-fantic-racing'),
  '1030dc7b-7fae-4369-946b-1a1b1edd49e7': logo('speedrs-team'),
};

const SLUG_LOGO: Record<string, string> = {
  ...Object.fromEntries(Object.keys(OFFICIAL_FILES).map((slug) => [slug, logo(slug)])),
  'cfmoto-impulse-aspar-team': logo('cfmoto-aspar-team'),
  'marc-vds-racing-team': logo('elf-marc-vds-racing-team'),
  'dynavolt-intact-gp': logo('liqui-moly-dynavolt-intact-gp'),
  'fantic-racing': logo('reds-fantic-racing'),
  'american-racing': logo('onlyfans-american-racing-team'),
  'gresini-moto2': logo('italjet-gresini-moto2'),
  'speed-up-racing': logo('speedrs-team'),
};

const slugify = (s: string): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const KEYWORD_LOGO: [string[], string][] = [
  [['blu', 'cru', 'pramac'], logo('blu-cru-pramac-yamaha-moto2')],
  [['cfmoto', 'aspar'], logo('cfmoto-aspar-team')],
  [['marc', 'vds'], logo('elf-marc-vds-racing-team')],
  [['idemitsu', 'honda'], logo('idemitsu-honda-team-asia')],
  [['italjet', 'gresini'], logo('italjet-gresini-moto2')],
  [['gresini', 'moto2'], logo('italjet-gresini-moto2')],
  [['italtrans'], logo('italtrans-racing-team')],
  [['klint'], logo('klint-racing-team')],
  [['dynavolt', 'intact'], logo('liqui-moly-dynavolt-intact-gp')],
  [['intact', 'gp'], logo('liqui-moly-dynavolt-intact-gp')],
  [['american', 'racing'], logo('onlyfans-american-racing-team')],
  [['qj', 'motor'], logo('qj-motor-galfer-msi')],
  [['red', 'bull', 'ktm', 'ajo'], logo('red-bull-ktm-ajo')],
  [['ktm', 'ajo'], logo('red-bull-ktm-ajo')],
  [['fantic'], logo('reds-fantic-racing')],
  [['speedrs'], logo('speedrs-team')],
  [['speed', 'up'], logo('speedrs-team')],
  [['rw', 'racing'], logo('momoven-idrofoglia-rw-racing-team')],
];

const matchKeywordLogo = (slug: string): string | null => {
  if (!slug) return null;
  for (const [words, url] of KEYWORD_LOGO) {
    if (words.every((w) => slug.includes(w))) return url;
  }
  return null;
};

const isBikeAssetUrl = (url: string | null | undefined): boolean =>
  Boolean(url && /\/main-picture\.|FrontalBike_/i.test(url));

function resolveLocalLogo(
  constructorId?: string | null,
  teamId?: string | null,
  teamName?: string | null,
): string | null {
  const tid = (teamId ?? '').trim().toLowerCase();
  if (tid && LOGO_BY_TEAM_ID[tid]) return LOGO_BY_TEAM_ID[tid];
  const slug = (constructorId ?? '').trim().toLowerCase();
  const nameSlug = slugify(teamName ?? '');
  const keys = [...new Set([slug, nameSlug].filter(Boolean))];
  for (const key of keys) {
    if (key && SLUG_LOGO[key]) return SLUG_LOGO[key];
    const kw = matchKeywordLogo(key);
    if (kw) return kw;
    for (const [alias, url] of Object.entries(SLUG_LOGO)) {
      if (key.includes(alias) || alias.includes(key)) return url;
    }
  }
  return null;
}

/** Retrato local por driverId (fallback si Pulse no devuelve headshotUrl). */
export function moto2DriverHeadshotUrl(
  driverId?: string | null,
  apiUrl?: string | null,
): string {
  const id = (driverId ?? '').trim();
  const fromApi = (apiUrl && String(apiUrl).trim()) || '';
  if (fromApi) return fromApi;
  return id ? (MOTO2_DRIVER_PORTRAIT_URL[id] ?? '') : '';
}

export function moto2TeamLogoUrl(
  constructorId?: string | null,
  teamId?: string | null,
  apiLogoUrl?: string | null,
  teamName?: string | null,
): string | null {
  const local =
    resolveLocalLogo(constructorId, teamId, teamName) ??
    (apiLogoUrl && !isBikeAssetUrl(apiLogoUrl) ? apiLogoUrl : null);
  return moto2LogoAbsoluteUrl(local);
}

export function moto2TeamBikeUrl(bikeImageUrl?: string | null): string | null {
  if (bikeImageUrl && isBikeAssetUrl(bikeImageUrl)) return bikeImageUrl;
  return null;
}

/** Logos banner muy anchos (Speed Up, Intact, etc.) */
const WIDE_LOGO_SLUGS = new Set([
  'speedrs-team',
  'onlyfans-american-racing-team',
  'klint-racing-team',
  'liqui-moly-dynavolt-intact-gp',
]);

/** Logos pequeños en bitmap — permitir algo más de escala */
const COMPACT_LOGO_SLUGS = new Set(['idemitsu-honda-team-asia', 'red-bull-ktm-ajo']);

/** Clases para <img> en cards de equipos o clasificación. */
export function moto2TeamLogoCardClass(constructorId?: string | null): string {
  const id = (constructorId ?? '').trim().toLowerCase();
  const parts = ['moto2-team-logo'];
  if (WIDE_LOGO_SLUGS.has(id)) parts.push('moto2-team-logo--wide');
  else if (COMPACT_LOGO_SLUGS.has(id)) parts.push('moto2-team-logo--compact');
  return parts.join(' ');
}

/** Clases del grid de equipos (reutiliza estilos fc-constructors). */
export function moto2TeamLogoGridClass(constructorId?: string | null): string {
  return `fc-team-showcase-img ${moto2TeamLogoCardClass(constructorId)}`;
}
