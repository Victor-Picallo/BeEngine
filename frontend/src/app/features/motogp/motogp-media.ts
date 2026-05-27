/**
 * URLs de medios MotoGP desde el API (Supabase). Sin mapas locales.
 */
export function motogpLogoAbsoluteUrl(path: string | null | undefined): string | null {
  const p = (path ?? '').trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  return null;
}

const isBikeAssetUrl = (url: string | null | undefined): boolean =>
  Boolean(url && /\/main-picture\.|FrontalBike_/i.test(url));

export function resolveOfficialTeamSlug(
  constructorId?: string | null,
  _teamId?: string | null,
  _teamName?: string | null,
): string | null {
  const slug = (constructorId ?? '').trim().toLowerCase();
  return slug || null;
}

export function motogpTeamLogoUrl(
  _constructorId?: string | null,
  _teamId?: string | null,
  apiLogoUrl?: string | null,
  _teamName?: string | null,
): string | null {
  if (apiLogoUrl && !isBikeAssetUrl(apiLogoUrl)) {
    return motogpLogoAbsoluteUrl(apiLogoUrl);
  }
  return null;
}

export function motogpTeamBikeUrl(
  bikeImageUrl?: string | null,
  _constructorId?: string | null,
  _teamId?: string | null,
): string | null {
  if (bikeImageUrl && isBikeAssetUrl(bikeImageUrl)) return bikeImageUrl;
  return null;
}
