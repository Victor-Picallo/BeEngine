/**
 * Logos oficiales del grid Moto3 2026 (13 equipos Pulse).
 * Assets: frontend/public/moto3/teams/ — script: backend/scripts/download-moto3-team-logos.mjs
 */

const LOCAL = (file) => `/moto3/teams/${file}`;

/** slug Pulse → archivo en public/moto3/teams */
export const MOTO3_OFFICIAL_LOGO_FILES = {
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

const logo = (slug) => LOCAL(MOTO3_OFFICIAL_LOGO_FILES[slug]);

/** teamId Pulse Live → logo local */
export const MOTO3_TEAM_LOGO_URL = {
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

export const MOTO3_TEAM_LOGO_BY_SLUG = {
  ...Object.fromEntries(Object.keys(MOTO3_OFFICIAL_LOGO_FILES).map((slug) => [slug, logo(slug)])),
  'cfmoto-aspar-team': logo('cfmoto-gaviota-aspar-team'),
  'aspar-team': logo('cfmoto-gaviota-aspar-team'),
  'dynavolt-intact-gp': logo('liqui-moly-dynavolt-intact-gp'),
  'intact-gp': logo('liqui-moly-dynavolt-intact-gp'),
  'idemitsu-honda-team-asia': logo('honda-team-asia'),
  'frinsa-mt-helmets-msi': logo('aeon-credit-mt-helmets-msi'),
  'mt-helmets-msi': logo('aeon-credit-mt-helmets-msi'),
  'qj-motor-galfer-msi': logo('aeon-credit-mt-helmets-msi'),
  'levelup-mta': logo('level-up-mta'),
  'snipers-team': logo('rivacold-snipers-team'),
  'kopron-rivacold-snipers-team': logo('rivacold-snipers-team'),
  'gryd-mlav': logo('gryd-mlav-racing'),
  'mlav-racing': logo('gryd-mlav-racing'),
};

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const LOGO_BY_KEYWORD = [
  [['cfmoto', 'gaviota'], logo('cfmoto-gaviota-aspar-team')],
  [['cfmoto', 'aspar'], logo('cfmoto-gaviota-aspar-team')],
  [['leopard'], logo('leopard-racing')],
  [['red', 'bull', 'ktm', 'ajo'], logo('red-bull-ktm-ajo')],
  [['ktm', 'ajo'], logo('red-bull-ktm-ajo')],
  [['red', 'bull', 'ktm', 'tech'], logo('red-bull-ktm-tech3')],
  [['ktm', 'tech3'], logo('red-bull-ktm-tech3')],
  [['dynavolt', 'intact'], logo('liqui-moly-dynavolt-intact-gp')],
  [['intact', 'gp'], logo('liqui-moly-dynavolt-intact-gp')],
  [['honda', 'team', 'asia'], logo('honda-team-asia')],
  [['honda', 'asia'], logo('honda-team-asia')],
  [['level', 'up', 'mta'], logo('level-up-mta')],
  [['levelup', 'mta'], logo('level-up-mta')],
  [['cip', 'green'], logo('cip-green-power')],
  [['aeon', 'credit'], logo('aeon-credit-mt-helmets-msi')],
  [['mt', 'helmets', 'msi'], logo('aeon-credit-mt-helmets-msi')],
  [['gryd', 'mlav'], logo('gryd-mlav-racing')],
  [['mlav'], logo('gryd-mlav-racing')],
  [['sic58'], logo('sic58-squadra-corse')],
  [['rivacold', 'snipers'], logo('rivacold-snipers-team')],
  [['snipers'], logo('rivacold-snipers-team')],
  [['code', 'motorsports'], logo('code-motorsports')],
];

const matchKeywordLogo = (slug) => {
  if (!slug) return null;
  for (const [words, url] of LOGO_BY_KEYWORD) {
    if (words.every((w) => slug.includes(w))) return url;
  }
  return null;
};

export const MOTO3_OFFICIAL_SLUGS = new Set(Object.keys(MOTO3_OFFICIAL_LOGO_FILES));

export const resolveMoto3TeamLogoUrl = (teamId, constructorId, teamName) => {
  const tid = String(teamId || '').trim().toLowerCase();
  if (tid && MOTO3_TEAM_LOGO_URL[tid]) return MOTO3_TEAM_LOGO_URL[tid];
  const slug = String(constructorId || '').trim().toLowerCase();
  const nameSlug = slugify(teamName);
  const keys = [...new Set([slug, nameSlug].filter(Boolean))];
  for (const key of keys) {
    if (key && MOTO3_TEAM_LOGO_BY_SLUG[key]) return MOTO3_TEAM_LOGO_BY_SLUG[key];
    const kw = matchKeywordLogo(key);
    if (kw) return kw;
    for (const [alias, url] of Object.entries(MOTO3_TEAM_LOGO_BY_SLUG)) {
      if (key.includes(alias) || alias.includes(key)) return url;
    }
  }
  return null;
};

export const resolveMoto3OfficialConstructorSlug = (teamId, constructorId, teamName) => {
  const logoPath = resolveMoto3TeamLogoUrl(teamId, constructorId, teamName);
  if (!logoPath) return slugify(constructorId || teamName) || null;
  const file = logoPath.split('/').pop() ?? '';
  return file.replace(/\.(svg|png|jpe?g|webp)$/i, '');
};
