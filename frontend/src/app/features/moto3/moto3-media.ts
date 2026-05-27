/**
 * Medios Moto3 desde el API (Supabase). Sin mapas locales.
 */
export function moto3LogoAbsoluteUrl(path: string | null | undefined): string | null {
  const p = (path ?? '').trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  return null;
}

const isBikeAssetUrl = (url: string | null | undefined): boolean =>
  Boolean(url && /\/main-picture\.|FrontalBike_/i.test(url));

export function moto3DriverHeadshotUrl(
  _driverId?: string | null,
  apiUrl?: string | null,
): string {
  return (apiUrl && String(apiUrl).trim()) || '';
}

export function moto3TeamLogoUrl(
  _constructorId?: string | null,
  _teamId?: string | null,
  apiLogoUrl?: string | null,
  _teamName?: string | null,
): string | null {
  if (apiLogoUrl && !isBikeAssetUrl(apiLogoUrl)) {
    return moto3LogoAbsoluteUrl(apiLogoUrl);
  }
  return null;
}

export function moto3TeamBikeUrl(bikeImageUrl?: string | null): string | null {
  if (bikeImageUrl && isBikeAssetUrl(bikeImageUrl)) return bikeImageUrl;
  return null;
}

const WIDE_LOGO_SLUGS = new Set(['liqui-moly-dynavolt-intact-gp', 'level-up-mta']);

const BOOST_LOGO_SLUGS = new Set([
  'cfmoto-gaviota-aspar-team',
  'leopard-racing',
  'honda-team-asia',
  'sic58-squadra-corse',
]);

const COMPACT_LOGO_SLUGS = new Set(['red-bull-ktm-ajo', 'red-bull-ktm-tech3']);

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
