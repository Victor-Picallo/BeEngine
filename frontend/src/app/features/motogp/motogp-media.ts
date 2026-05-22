/**
 * Logos oficiales de los 11 equipos MotoGP (frontend/public/motogp/teams, servidos por el API).
 */
import { environment } from '../../../environments/environment';

/** Origen del API sin /api — p. ej. http://localhost:3000 */
export function motogpAssetOrigin(): string {
  return environment.apiUrl.replace(/\/api\/?$/, '');
}

/**
 * URL usable en <img>: logos en public/motogp/teams (mismo origen que Angular).
 * Otros paths del API siguen yendo al host del backend.
 */
export function motogpLogoAbsoluteUrl(path: string | null | undefined): string | null {
  const p = (path ?? '').trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith('/motogp/teams/')) return p;
  if (p.startsWith('/')) return `${motogpAssetOrigin()}${p}`;
  return p;
}

const L = (file: string) => `/motogp/teams/${file}`;

const OFFICIAL_FILES: Record<string, string> = {
  'aprilia-racing': 'aprilia-racing.svg',
  'bk8-gresini-racing-motogp': 'bk8-gresini-racing-motogp.png',
  'ducati-lenovo-team': 'ducati-lenovo-team.png',
  'honda-hrc-castrol': 'honda-hrc-castrol.png',
  'lcr-honda': 'lcr-honda.png',
  'monster-energy-yamaha-motogp': 'monster-energy-yamaha-motogp.png',
  'pertamina-enduro-vr46-racing-team': 'pertamina-enduro-vr46-racing-team.png',
  'prima-pramac-yamaha-motogp': 'prima-pramac-yamaha-motogp.jpg',
  'red-bull-ktm-factory-racing': 'red-bull-ktm-factory-racing.png',
  'red-bull-ktm-tech3': 'red-bull-ktm-tech3.png',
  'trackhouse-motogp-team': 'trackhouse-motogp-team.png',
};

const logo = (slug: string) => L(OFFICIAL_FILES[slug]);

const LOGO_BY_TEAM_ID: Record<string, string> = {
  '11d18b37-baba-400a-80c2-f8ddf040f97e': logo('aprilia-racing'),
  '11729e67-d2cb-41ad-b3a8-4a0ac5768a5f': logo('bk8-gresini-racing-motogp'),
  '892fff2f-7402-4fbd-99fb-5fd567d8a80c': logo('ducati-lenovo-team'),
  'ce837bd3-bc07-40ef-83cf-6a8025bededf': logo('honda-hrc-castrol'),
  '77a0174a-c84d-4955-a722-b39e4d8e4ce5': logo('lcr-honda'),
  '141b6f0f-7e53-4d27-9bdb-0ea8fba7e842': logo('monster-energy-yamaha-motogp'),
  '4130a48f-fa91-48be-a50c-f8a2e3f863a0': logo('pertamina-enduro-vr46-racing-team'),
  '598ccfb2-e0f1-4ad7-92b7-00ec9238a72c': logo('prima-pramac-yamaha-motogp'),
  '0b6cc118-a286-4343-9020-fb53c6f77c1a': logo('red-bull-ktm-factory-racing'),
  '8a8633cd-a3e2-4a3d-aa24-66b99014a9dd': logo('red-bull-ktm-tech3'),
  '8532f5e4-c2f3-417b-8c76-09302a826dd4': logo('trackhouse-motogp-team'),
};

const SLUG_LOGO: Record<string, string> = {
  ...Object.fromEntries(Object.keys(OFFICIAL_FILES).map((slug) => [slug, logo(slug)])),
  'gresini-racing-motogp': logo('bk8-gresini-racing-motogp'),
  'trackhouse-racing': logo('trackhouse-motogp-team'),
  'vr46-racing-team': logo('pertamina-enduro-vr46-racing-team'),
  'monster-energy-yamaha-motogp-team': logo('monster-energy-yamaha-motogp'),
  'ktm-factory-racing': logo('red-bull-ktm-factory-racing'),
  'castrol-honda-lcr': logo('lcr-honda'),
  'pro-honda-lcr': logo('lcr-honda'),
  'yamaha-factory-racing': logo('monster-energy-yamaha-motogp'),
};

const slugify = (s: string): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const KEYWORD_LOGO: [string[], string][] = [
  [['castrol', 'lcr'], logo('lcr-honda')],
  [['pro', 'honda', 'lcr'], logo('lcr-honda')],
  [['pertamina', 'vr46'], logo('pertamina-enduro-vr46-racing-team')],
  [['vr46'], logo('pertamina-enduro-vr46-racing-team')],
  [['pramac'], logo('prima-pramac-yamaha-motogp')],
  [['gresini'], logo('bk8-gresini-racing-motogp')],
  [['trackhouse'], logo('trackhouse-motogp-team')],
  [['ducati', 'lenovo'], logo('ducati-lenovo-team')],
  [['honda', 'hrc'], logo('honda-hrc-castrol')],
  [['aprilia'], logo('aprilia-racing')],
  [['tech3'], logo('red-bull-ktm-tech3')],
  [['ktm', 'factory'], logo('red-bull-ktm-factory-racing')],
  [['ktm'], logo('red-bull-ktm-factory-racing')],
  [['yamaha', 'factory'], logo('monster-energy-yamaha-motogp')],
  [['monster', 'yamaha'], logo('monster-energy-yamaha-motogp')],
  [['yamaha'], logo('monster-energy-yamaha-motogp')],
  [['lcr'], logo('lcr-honda')],
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

/** Slug del equipo oficial (11 del grid) a partir de id o nombre de clasificación. */
export function resolveOfficialTeamSlug(
  constructorId?: string | null,
  teamId?: string | null,
  teamName?: string | null,
): string | null {
  const path = resolveLocalLogo(constructorId, teamId, teamName);
  if (!path) return null;
  const file = path.split('/').pop() ?? '';
  return file.replace(/\.(svg|png|jpe?g|webp)$/i, '');
}

export function motogpTeamLogoUrl(
  constructorId?: string | null,
  teamId?: string | null,
  apiLogoUrl?: string | null,
  teamName?: string | null,
): string | null {
  const local =
    resolveLocalLogo(constructorId, teamId, teamName) ??
    (apiLogoUrl && !isBikeAssetUrl(apiLogoUrl) ? apiLogoUrl : null);
  return motogpLogoAbsoluteUrl(local);
}

export function motogpTeamBikeUrl(
  bikeImageUrl?: string | null,
  constructorId?: string | null,
  teamId?: string | null,
): string | null {
  if (bikeImageUrl && isBikeAssetUrl(bikeImageUrl)) return bikeImageUrl;
  return null;
}
