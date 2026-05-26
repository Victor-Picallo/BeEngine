/**
 * Logos y retratos Moto3 (public/moto3/teams + snapshot motogp.com).
 */
import { environment } from '../../../environments/environment';
import { MOTO3_DRIVER_PORTRAIT_URL } from './moto3-portraits.data';

export function moto3AssetOrigin(): string {
  return environment.apiUrl.replace(/\/api\/?$/, '');
}

export function moto3LogoAbsoluteUrl(path: string | null | undefined): string | null {
  const p = (path ?? '').trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith('/moto3/teams/')) return p;
  if (p.startsWith('/')) return `${moto3AssetOrigin()}${p}`;
  return p;
}

const L = (file: string) => `/moto3/teams/${file}`;

const OFFICIAL_FILES: Record<string, string> = {
  'aeon-credit-mt-helmets-msi': 'aeon-credit-mt-helmets-msi.png',
  'cfmoto-gaviota-aspar-team': 'cfmoto-gaviota-aspar-team.png',
  'cip-green-power': 'cip-green-power.png',
  'code-motorsports': 'code-motorsports.png',
  'gryd-mlav-racing': 'gryd-mlav-racing.png',
  'honda-team-asia': 'honda-team-asia.png',
  'leopard-racing': 'leopard-racing.svg',
  'level-up-mta': 'level-up-mta.png',
  'liqui-moly-dynavolt-intact-gp': 'liqui-moly-dynavolt-intact-gp.svg',
  'red-bull-ktm-ajo': 'red-bull-ktm-ajo.png',
  'red-bull-ktm-tech3': 'red-bull-ktm-tech3.png',
  'rivacold-snipers-team': 'rivacold-snipers-team.png',
  'sic58-squadra-corse': 'sic58-squadra-corse.svg',
};

const logo = (slug: string) => L(OFFICIAL_FILES[slug]);

const LOGO_BY_TEAM_ID: Record<string, string> = {
  'c8943f04-52b2-4e40-b5cc-d184cc534807': logo('cfmoto-gaviota-aspar-team'),
  'a713a7ba-16ec-4c15-b4a3-7211b43f9a89': logo('leopard-racing'),
  '9340a4a6-b2d4-4b72-be92-86718936c547': logo('red-bull-ktm-ajo'),
  '0c8d75e7-f283-4713-b1a8-6440e0aafa0a': logo('liqui-moly-dynavolt-intact-gp'),
  '274007da-aa69-4f74-b987-e910363bf8e3': logo('red-bull-ktm-tech3'),
  '83291c7a-76ca-400c-bda5-a17a6531f9e3': logo('honda-team-asia'),
  'df8e39c5-dd52-4c4f-9c7c-3853768e3bee': logo('level-up-mta'),
  '5f0a22a4-af1f-46ca-baf6-e688f6da8843': logo('cip-green-power'),
  'c8d2f693-73de-4c4b-bb92-6adbd8be070d': logo('aeon-credit-mt-helmets-msi'),
  '2289ee89-1833-4d23-9a46-0014424c6c03': logo('gryd-mlav-racing'),
  '5a444866-8ea4-42fa-bcf7-8c2d0d07a238': logo('sic58-squadra-corse'),
  'af16ee18-7558-42dd-9e2c-b455a66b4a16': logo('rivacold-snipers-team'),
  '9c3b2f14-28e0-4c9f-a3ac-be1531bcd514': logo('code-motorsports'),
};

const SLUG_LOGO: Record<string, string> = {
  ...Object.fromEntries(Object.keys(OFFICIAL_FILES).map((slug) => [slug, logo(slug)])),
  'cfmoto-aspar-team': logo('cfmoto-gaviota-aspar-team'),
  'dynavolt-intact-gp': logo('liqui-moly-dynavolt-intact-gp'),
  'idemitsu-honda-team-asia': logo('honda-team-asia'),
  'frinsa-mt-helmets-msi': logo('aeon-credit-mt-helmets-msi'),
  'levelup-mta': logo('level-up-mta'),
  'snipers-team': logo('rivacold-snipers-team'),
};

const slugify = (s: string): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const KEYWORD_LOGO: [string[], string][] = [
  [['cfmoto', 'gaviota'], logo('cfmoto-gaviota-aspar-team')],
  [['cfmoto', 'aspar'], logo('cfmoto-gaviota-aspar-team')],
  [['leopard'], logo('leopard-racing')],
  [['red', 'bull', 'ktm', 'ajo'], logo('red-bull-ktm-ajo')],
  [['ktm', 'tech3'], logo('red-bull-ktm-tech3')],
  [['dynavolt', 'intact'], logo('liqui-moly-dynavolt-intact-gp')],
  [['honda', 'asia'], logo('honda-team-asia')],
  [['level', 'up', 'mta'], logo('level-up-mta')],
  [['cip', 'green'], logo('cip-green-power')],
  [['aeon', 'credit'], logo('aeon-credit-mt-helmets-msi')],
  [['mt', 'helmets', 'msi'], logo('aeon-credit-mt-helmets-msi')],
  [['gryd', 'mlav'], logo('gryd-mlav-racing')],
  [['sic58'], logo('sic58-squadra-corse')],
  [['rivacold', 'snipers'], logo('rivacold-snipers-team')],
  [['snipers'], logo('rivacold-snipers-team')],
  [['code', 'motorsports'], logo('code-motorsports')],
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

export function moto3DriverHeadshotUrl(
  driverId?: string | null,
  apiUrl?: string | null,
): string {
  const id = (driverId ?? '').trim();
  const fromApi = (apiUrl && String(apiUrl).trim()) || '';
  if (fromApi) return fromApi;
  return id ? (MOTO3_DRIVER_PORTRAIT_URL[id] ?? '') : '';
}

export function moto3TeamLogoUrl(
  constructorId?: string | null,
  teamId?: string | null,
  apiLogoUrl?: string | null,
  teamName?: string | null,
): string | null {
  const local =
    resolveLocalLogo(constructorId, teamId, teamName) ??
    (apiLogoUrl && !isBikeAssetUrl(apiLogoUrl) ? apiLogoUrl : null);
  return moto3LogoAbsoluteUrl(local);
}

export function moto3TeamBikeUrl(bikeImageUrl?: string | null): string | null {
  if (bikeImageUrl && isBikeAssetUrl(bikeImageUrl)) return bikeImageUrl;
  return null;
}

const WIDE_LOGO_SLUGS = new Set(['liqui-moly-dynavolt-intact-gp', 'level-up-mta']);

/** Logos pequeños o con poco peso visual — más escala en la tarjeta */
const BOOST_LOGO_SLUGS = new Set([
  'cfmoto-gaviota-aspar-team',
  'leopard-racing',
  'honda-team-asia',
  'sic58-squadra-corse',
]);

const COMPACT_LOGO_SLUGS = new Set(['red-bull-ktm-ajo', 'red-bull-ktm-tech3']);

/** PNG con fondo negro: almohadilla gris en tarjeta blanca */
const DARK_BG_PAD_SLUGS = new Set(['cip-green-power', 'code-motorsports']);

export function moto3TeamLogoCardClass(constructorId?: string | null): string {
  const id = (constructorId ?? '').trim().toLowerCase();
  const parts = ['moto3-team-logo'];
  if (WIDE_LOGO_SLUGS.has(id)) parts.push('moto3-team-logo--wide');
  else if (BOOST_LOGO_SLUGS.has(id)) parts.push('moto3-team-logo--boost');
  else if (COMPACT_LOGO_SLUGS.has(id)) parts.push('moto3-team-logo--compact');
  if (DARK_BG_PAD_SLUGS.has(id)) parts.push('moto3-team-logo--dark-pad');
  return parts.join(' ');
}

export function moto3TeamLogoGridClass(constructorId?: string | null): string {
  return `fc-team-showcase-img ${moto3TeamLogoCardClass(constructorId)}`;
}
