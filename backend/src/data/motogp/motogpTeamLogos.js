/**
 * Logos oficiales de los 11 equipos del grid MotoGP 2026.
 * Assets: frontend/public/motogp/teams/ o Supabase beengine-media/motogp/constructors/
 */
import { toPublicMediaUrl } from '../../lib/supabaseStorage.js';

const pub = (path) => (path ? toPublicMediaUrl(path) : null);

const LOCAL = (file) => pub(`/motogp/teams/${file}`);

/** Los 11 archivos oficiales (slug = nombre de archivo sin extensión) */
export const MOTOGP_OFFICIAL_LOGO_FILES = {
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

const logo = (slug) => LOCAL(MOTOGP_OFFICIAL_LOGO_FILES[slug]);

/** teamId Pulse Live → logo oficial */
export const MOTOGP_TEAM_LOGO_URL = {
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

/** Nombres de clasificación Pulse / alias → uno de los 11 oficiales */
export const MOTOGP_TEAM_LOGO_BY_SLUG = {
  ...Object.fromEntries(
    Object.keys(MOTOGP_OFFICIAL_LOGO_FILES).map((slug) => [slug, logo(slug)]),
  ),
  'gresini-racing-motogp': logo('bk8-gresini-racing-motogp'),
  'trackhouse-racing': logo('trackhouse-motogp-team'),
  'vr46-racing-team': logo('pertamina-enduro-vr46-racing-team'),
  'monster-energy-yamaha-motogp-team': logo('monster-energy-yamaha-motogp'),
  'ktm-factory-racing': logo('red-bull-ktm-factory-racing'),
  // Entradas de clasificación que no son equipos del grid → equipo oficial
  'castrol-honda-lcr': logo('lcr-honda'),
  'pro-honda-lcr': logo('lcr-honda'),
  'yamaha-factory-racing': logo('monster-energy-yamaha-motogp'),
};

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Orden: coincidencias más específicas primero; todas resuelven a un logo oficial */
const LOGO_BY_KEYWORD = [
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

const matchKeywordLogo = (slug) => {
  if (!slug) return null;
  for (const [words, url] of LOGO_BY_KEYWORD) {
    if (words.every((w) => slug.includes(w))) return url;
  }
  return null;
};

/** Slug del grid oficial (11 equipos) a partir de id / nombre de clasificación. */
export const resolveOfficialConstructorSlug = (teamId, constructorId, teamName) => {
  const logoPath = resolveMotogpTeamLogoUrl(teamId, constructorId, teamName);
  if (!logoPath) return null;
  const file = logoPath.split('/').pop() ?? '';
  return file.replace(/\.(svg|png|jpe?g|webp)$/i, '');
};

export const MOTOGP_OFFICIAL_SLUGS = new Set(Object.keys(MOTOGP_OFFICIAL_LOGO_FILES));

export const resolveMotogpTeamLogoUrl = (teamId, constructorId, teamName) => {
  const tid = String(teamId || '').trim().toLowerCase();
  if (tid && MOTOGP_TEAM_LOGO_URL[tid]) return MOTOGP_TEAM_LOGO_URL[tid];
  const slug = String(constructorId || '').trim().toLowerCase();
  const nameSlug = slugify(teamName);
  const keys = [...new Set([slug, nameSlug].filter(Boolean))];
  for (const key of keys) {
    if (key && MOTOGP_TEAM_LOGO_BY_SLUG[key]) return MOTOGP_TEAM_LOGO_BY_SLUG[key];
    const kw = matchKeywordLogo(key);
    if (kw) return kw;
    for (const [alias, url] of Object.entries(MOTOGP_TEAM_LOGO_BY_SLUG)) {
      if (key.includes(alias) || alias.includes(key)) return url;
    }
  }
  return null;
};
