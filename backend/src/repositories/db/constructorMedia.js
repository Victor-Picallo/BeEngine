import { requirePrisma } from '../../lib/prisma.js';
import { toPublicMediaUrl } from '../../lib/supabaseStorage.js';

/** Fondos Pulse / `picture` de equipo (no escudos). */
const isPulseTeamBrandingUrl = (url) =>
  Boolean(
    url &&
      (/background_picture|BackgroundPicture|\/background\//i.test(String(url)) ||
        /\/picture\.(jpg|jpeg|png|webp)/i.test(String(url))),
  );

/** @returns {Promise<Map<string, { logoUrl: string | null, bikeImageUrl: string | null, teamColor: string | null }>>} */
export async function getConstructorSeasonMediaMap(seasonId) {
  const rows = await requirePrisma().constructorSeason.findMany({
    where: { seasonId },
    select: { constructorId: true, logoUrl: true, bikeImageUrl: true, teamColor: true },
  });
  const map = new Map();
  for (const row of rows) {
    map.set(row.constructorId.toLowerCase(), {
      logoUrl: toPublicMediaUrl(row.logoUrl),
      bikeImageUrl: toPublicMediaUrl(row.bikeImageUrl),
      teamColor: row.teamColor ?? null,
    });
  }
  return map;
}

/** Superpone logo/coche/color desde Postgres sobre standings live (Jolpica/FIA no traen medios). */
export function enrichConstructorStandingsWithMedia(items, mediaMap) {
  if (!Array.isArray(items) || !mediaMap?.size) return items;
  return items.map((row) => {
    const id = String(row.constructorId ?? '')
      .trim()
      .toLowerCase();
    const media = id ? mediaMap.get(id) : null;
    if (!media) return row;
    const liveLogo = row.logoUrl ?? null;
    const dbLogo = media.logoUrl ?? null;
    const logoUrl =
      dbLogo && isPulseTeamBrandingUrl(liveLogo) ? dbLogo : liveLogo ?? dbLogo ?? null;
    return {
      ...row,
      logoUrl,
      bikeImageUrl: row.bikeImageUrl ?? media.bikeImageUrl ?? null,
      teamColor: row.teamColor ?? media.teamColor ?? null,
    };
  });
}
