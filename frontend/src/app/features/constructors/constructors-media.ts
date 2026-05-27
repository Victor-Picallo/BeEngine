import type { SeriesId } from '../../core/series/series.types';

/** URL absoluta desde el API (Supabase). Sin mapas CDN locales. */
export function absoluteMediaUrl(path: string | null | undefined): string | null {
  const p = (path ?? '').trim();
  if (!p) return null;
  return /^https?:\/\//i.test(p) ? p : null;
}

export function f1TeamShowcaseImageUrl(
  _constructorId: string,
  _seriesId?: SeriesId,
  apiLogoUrl?: string | null,
): string | null {
  return absoluteMediaUrl(apiLogoUrl);
}

export function f1TeamCarImageUrl(
  _constructorId: string,
  _seriesId?: SeriesId,
  apiBikeUrl?: string | null,
): string | null {
  return absoluteMediaUrl(apiBikeUrl);
}
