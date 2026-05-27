import { requirePrisma } from '../../lib/prisma.js';
import { toPublicMediaUrl } from '../../lib/supabaseStorage.js';
import { resolveFormulaCircuitAssets } from '../../data/shared/formulaCircuitAssets.js';
import { isMotoSeasonId } from '../../services/shared/circuitEnrichment.service.js';

/** @returns {Promise<Map<number, { circuitId: string | null, circuitSvgUrl: string | null, circuitImageUrl: string | null }>>} */
export async function getEventCircuitMediaMap(seasonId) {
  const rows = await requirePrisma().event.findMany({
    where: { seasonId },
    select: {
      round: true,
      circuitId: true,
      circuitName: true,
      raceName: true,
      locality: true,
      country: true,
      circuitSvgUrl: true,
      circuitImageUrl: true,
    },
  });
  const map = new Map();
  for (const row of rows) {
    let circuitSvgUrl = toPublicMediaUrl(row.circuitSvgUrl);
    let circuitImageUrl = toPublicMediaUrl(row.circuitImageUrl);
    const circuitId = row.circuitId ?? null;

    if (
      !isMotoSeasonId(seasonId) &&
      (isPulseCircuitUrl(circuitSvgUrl) || isPulseCircuitUrl(circuitImageUrl))
    ) {
      const formula = resolveFormulaCircuitAssets(row);
      if (formula) {
        circuitSvgUrl = formula.circuitSvgUrl;
        circuitImageUrl = formula.circuitImageUrl ?? formula.circuitSvgUrl;
      }
    }

    map.set(row.round, {
      circuitId,
      circuitSvgUrl,
      circuitImageUrl: circuitImageUrl ?? null,
    });
  }
  return map;
}

function isPulseCircuitUrl(url) {
  if (!url) return false;
  const s = String(url).toLowerCase();
  return s.includes('pulselive') || s.includes('motogp.com') || s.includes('/moto');
}

/** Superpone circuitos de Postgres sobre calendario live (FIA/Jolpica no traen SVG). */
export function mergeCalendarWithCircuitMedia(items, mediaMap) {
  if (!Array.isArray(items) || !mediaMap?.size) return items;
  return items.map((row) => {
    const media = mediaMap.get(row.round);
    if (!media) return row;
    return {
      ...row,
      circuitId: row.circuitId ?? media.circuitId ?? null,
      circuitSvgUrl: media.circuitSvgUrl ?? row.circuitSvgUrl ?? null,
      circuitImageUrl: media.circuitImageUrl ?? row.circuitImageUrl ?? null,
    };
  });
}
