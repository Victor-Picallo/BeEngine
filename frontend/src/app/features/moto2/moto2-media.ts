/**
 * Medios Moto2 desde el API (Supabase). Sin mapas locales.
 */
export function moto2LogoAbsoluteUrl(path: string | null | undefined): string | null {
  const p = (path ?? '').trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  return null;
}

const isBikeAssetUrl = (url: string | null | undefined): boolean =>
  Boolean(url && /\/main-picture\.|FrontalBike_/i.test(url));

export function moto2DriverHeadshotUrl(
  _driverId?: string | null,
  apiUrl?: string | null,
): string {
  return (apiUrl && String(apiUrl).trim()) || '';
}

export function moto2TeamLogoUrl(
  _constructorId?: string | null,
  _teamId?: string | null,
  apiLogoUrl?: string | null,
  _teamName?: string | null,
): string | null {
  if (apiLogoUrl && !isBikeAssetUrl(apiLogoUrl)) {
    return moto2LogoAbsoluteUrl(apiLogoUrl);
  }
  return null;
}

export function moto2TeamBikeUrl(bikeImageUrl?: string | null): string | null {
  if (bikeImageUrl && isBikeAssetUrl(bikeImageUrl)) return bikeImageUrl;
  return null;
}

const WIDE_LOGO_SLUGS = new Set([
  'speedrs-team',
  'onlyfans-american-racing-team',
  'klint-racing-team',
  'liqui-moly-dynavolt-intact-gp',
]);

const COMPACT_LOGO_SLUGS = new Set(['idemitsu-honda-team-asia', 'red-bull-ktm-ajo']);

export function moto2TeamLogoCardClass(constructorId?: string | null): string {
  const id = (constructorId ?? '').trim().toLowerCase();
  const parts = ['moto2-team-logo'];
  if (WIDE_LOGO_SLUGS.has(id)) parts.push('moto2-team-logo--wide');
  else if (COMPACT_LOGO_SLUGS.has(id)) parts.push('moto2-team-logo--compact');
  return parts.join(' ');
}

export function moto2TeamLogoGridClass(constructorId?: string | null): string {
  return `fc-team-showcase-img ${moto2TeamLogoCardClass(constructorId)}`;
}
