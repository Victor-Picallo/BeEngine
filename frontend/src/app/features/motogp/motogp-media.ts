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
  Boolean(url && /\/main-picture\.|FrontalBike_|\/bikes\//i.test(url));

/** Fondos / banners de equipo en Pulse (no son escudos). */
const isTeamBrandingTextureUrl = (url: string | null | undefined): boolean =>
  Boolean(
    url &&
      (/background_picture|BackgroundPicture|\/background\//i.test(url) ||
        /\/picture\.(jpg|png|webp)/i.test(url)),
  );

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
  if (apiLogoUrl && !isBikeAssetUrl(apiLogoUrl) && !isTeamBrandingTextureUrl(apiLogoUrl)) {
    return motogpLogoAbsoluteUrl(apiLogoUrl);
  }
  return null;
}

const WIDE_LOGO_SLUGS = new Set([
  'pertamina-enduro-vr46-racing-team',
  'vr46-racing-team',
  'prima-pramac-yamaha-motogp',
  'trackhouse-motogp-team',
]);

const COMPACT_LOGO_SLUGS = new Set(['castrol-honda-lcr', 'lcr-honda', 'gresini-racing-motogp']);

export function motogpTeamLogoCardClass(constructorId?: string | null): string {
  const id = (constructorId ?? '').trim().toLowerCase();
  const parts = ['motogp-team-logo'];
  if (WIDE_LOGO_SLUGS.has(id)) parts.push('motogp-team-logo--wide');
  else if (COMPACT_LOGO_SLUGS.has(id)) parts.push('motogp-team-logo--compact');
  return parts.join(' ');
}

export function motogpTeamLogoGridClass(constructorId?: string | null): string {
  return `fc-team-showcase-img ${motogpTeamLogoCardClass(constructorId)}`;
}

export function motogpTeamBikeUrl(
  bikeImageUrl?: string | null,
  _constructorId?: string | null,
  _teamId?: string | null,
): string | null {
  if (bikeImageUrl && isBikeAssetUrl(bikeImageUrl)) return bikeImageUrl;
  return null;
}
