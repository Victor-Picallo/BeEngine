/**
 * Logos oficiales del grid Moto2 2026 (14 equipos Pulse).
 * Assets: frontend/public/moto2/teams/ o Supabase beengine-media/moto2/constructors/
 */
import { toPublicMediaUrl } from '../../lib/supabaseStorage.js';

const pub = (path) => (path ? toPublicMediaUrl(path) : null);

const LOCAL = (file) => pub(`/moto2/teams/${file}`);

/** slug Pulse → archivo en public/moto2/teams */
export const MOTO2_OFFICIAL_LOGO_FILES = {
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

const logo = (slug) => LOCAL(MOTO2_OFFICIAL_LOGO_FILES[slug]);

/** teamId Pulse Live → logo local */
export const MOTO2_TEAM_LOGO_URL = {
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

export const MOTO2_TEAM_LOGO_BY_SLUG = {
  ...Object.fromEntries(
    Object.keys(MOTO2_OFFICIAL_LOGO_FILES).map((slug) => [slug, logo(slug)]),
  ),
  'cfmoto-impulse-aspar-team': logo('cfmoto-aspar-team'),
  'aspar-team': logo('cfmoto-aspar-team'),
  'marc-vds-racing-team': logo('elf-marc-vds-racing-team'),
  'elf-marc-vds': logo('elf-marc-vds-racing-team'),
  'dynavolt-intact-gp': logo('liqui-moly-dynavolt-intact-gp'),
  'intact-gp': logo('liqui-moly-dynavolt-intact-gp'),
  'fantic-racing': logo('reds-fantic-racing'),
  'reds-fantic': logo('reds-fantic-racing'),
  'american-racing': logo('onlyfans-american-racing-team'),
  'red-bull-ktm-ajo-motorsport': logo('red-bull-ktm-ajo'),
  'ajo-motorsport': logo('red-bull-ktm-ajo'),
  'speed-up-racing': logo('speedrs-team'),
  'beta-tools-speedrs-team': logo('speedrs-team'),
  'rw-racing-team': logo('momoven-idrofoglia-rw-racing-team'),
  'qj-motor-msi': logo('qj-motor-galfer-msi'),
  'mt-helmets-msi': logo('qj-motor-galfer-msi'),
  'gresini-moto2': logo('italjet-gresini-moto2'),
  'italjet-gresini': logo('italjet-gresini-moto2'),
  'blu-cru-pramac': logo('blu-cru-pramac-yamaha-moto2'),
  'pramac-yamaha-moto2': logo('blu-cru-pramac-yamaha-moto2'),
};

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const LOGO_BY_KEYWORD = [
  [['blu', 'cru', 'pramac'], logo('blu-cru-pramac-yamaha-moto2')],
  [['pramac', 'moto2'], logo('blu-cru-pramac-yamaha-moto2')],
  [['cfmoto', 'aspar'], logo('cfmoto-aspar-team')],
  [['aspar'], logo('cfmoto-aspar-team')],
  [['marc', 'vds'], logo('elf-marc-vds-racing-team')],
  [['elf', 'marc'], logo('elf-marc-vds-racing-team')],
  [['idemitsu', 'honda'], logo('idemitsu-honda-team-asia')],
  [['honda', 'team', 'asia'], logo('idemitsu-honda-team-asia')],
  [['italjet', 'gresini'], logo('italjet-gresini-moto2')],
  [['gresini', 'moto2'], logo('italjet-gresini-moto2')],
  [['italtrans'], logo('italtrans-racing-team')],
  [['klint'], logo('klint-racing-team')],
  [['dynavolt', 'intact'], logo('liqui-moly-dynavolt-intact-gp')],
  [['intact', 'gp'], logo('liqui-moly-dynavolt-intact-gp')],
  [['momoven', 'rw'], logo('momoven-idrofoglia-rw-racing-team')],
  [['rw', 'racing'], logo('momoven-idrofoglia-rw-racing-team')],
  [['american', 'racing'], logo('onlyfans-american-racing-team')],
  [['qj', 'motor'], logo('qj-motor-galfer-msi')],
  [['galfer', 'msi'], logo('qj-motor-galfer-msi')],
  [['red', 'bull', 'ktm', 'ajo'], logo('red-bull-ktm-ajo')],
  [['ktm', 'ajo'], logo('red-bull-ktm-ajo')],
  [['fantic'], logo('reds-fantic-racing')],
  [['speedrs'], logo('speedrs-team')],
  [['speed', 'up'], logo('speedrs-team')],
];

const matchKeywordLogo = (slug) => {
  if (!slug) return null;
  for (const [words, url] of LOGO_BY_KEYWORD) {
    if (words.every((w) => slug.includes(w))) return url;
  }
  return null;
};

export const MOTO2_OFFICIAL_SLUGS = new Set(Object.keys(MOTO2_OFFICIAL_LOGO_FILES));

export const resolveMoto2TeamLogoUrl = (teamId, constructorId, teamName) => {
  const tid = String(teamId || '').trim().toLowerCase();
  if (tid && MOTO2_TEAM_LOGO_URL[tid]) return MOTO2_TEAM_LOGO_URL[tid];
  const slug = String(constructorId || '').trim().toLowerCase();
  const nameSlug = slugify(teamName);
  const keys = [...new Set([slug, nameSlug].filter(Boolean))];
  for (const key of keys) {
    if (key && MOTO2_TEAM_LOGO_BY_SLUG[key]) return MOTO2_TEAM_LOGO_BY_SLUG[key];
    const kw = matchKeywordLogo(key);
    if (kw) return kw;
    for (const [alias, url] of Object.entries(MOTO2_TEAM_LOGO_BY_SLUG)) {
      if (key.includes(alias) || alias.includes(key)) return url;
    }
  }
  return null;
};

export const resolveMoto2OfficialConstructorSlug = (teamId, constructorId, teamName) => {
  const logoPath = resolveMoto2TeamLogoUrl(teamId, constructorId, teamName);
  if (!logoPath) return null;
  const file = logoPath.split('/').pop() ?? '';
  return file.replace(/\.(svg|png|jpe?g|webp)$/i, '');
};
