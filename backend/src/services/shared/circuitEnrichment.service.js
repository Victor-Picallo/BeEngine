import { currentSeasonYear } from '../../repositories/db/season.repository.js';
import { resolveFormulaCircuitAssets } from '../../data/shared/formulaCircuitAssets.js';
import { findCircuitByName } from '../motogp/motogpCircuits.service.js';

/**
 * Enriquece filas de calendario F1/F2/F3 con SVG (coggs/f1_svg) y/o Pulse.
 * @param {object} row
 * @param {number} [seasonYear]
 */
export async function enrichCalendarRow(row, seasonYear = currentSeasonYear()) {
  if (row.circuitImageUrl && row.circuitSvgUrl) return row;

  let out = { ...row };

  const formula = resolveFormulaCircuitAssets(row);
  if (formula) {
    out = {
      ...out,
      circuitId: out.circuitId ?? formula.circuitId ?? null,
      circuitSvgUrl: out.circuitSvgUrl ?? formula.circuitSvgUrl ?? null,
      circuitImageUrl: out.circuitImageUrl ?? formula.circuitImageUrl ?? null,
    };
  }

  if (out.circuitImageUrl && out.circuitSvgUrl) return out;

  const lookup = row.circuitName || row.raceName;
  if (!lookup) return out;

  try {
    const c = await findCircuitByName(lookup, seasonYear);
    if (!c) return out;
    return {
      ...out,
      circuitId: out.circuitId ?? String(c.circuitId ?? c.slug ?? ''),
      circuitSvgUrl: out.circuitSvgUrl ?? c.svgUrl ?? null,
      circuitImageUrl: out.circuitImageUrl ?? c.imageUrl ?? null,
    };
  } catch {
    return out;
  }
}

/**
 * Rellena circuitos en eventos de una temporada que aún no tienen URLs.
 */
export async function enrichSeasonEventsMissingCircuits(prisma, seasonId, seasonYear) {
  const events = await prisma.event.findMany({
    where: {
      seasonId,
      OR: [{ circuitImageUrl: null }, { circuitSvgUrl: null }],
    },
    select: {
      round: true,
      circuitName: true,
      raceName: true,
      locality: true,
      country: true,
      circuitId: true,
      circuitImageUrl: true,
      circuitSvgUrl: true,
    },
  });

  let updated = 0;
  for (const ev of events) {
    const enriched = await enrichCalendarRow(
      {
        circuitName: ev.circuitName,
        raceName: ev.raceName,
        locality: ev.locality,
        country: ev.country,
        circuitId: ev.circuitId,
        circuitImageUrl: ev.circuitImageUrl,
        circuitSvgUrl: ev.circuitSvgUrl,
      },
      seasonYear,
    );
    if (
      enriched.circuitImageUrl === ev.circuitImageUrl &&
      enriched.circuitSvgUrl === ev.circuitSvgUrl &&
      enriched.circuitId === ev.circuitId
    ) {
      continue;
    }
    await prisma.event.updateMany({
      where: { seasonId, round: ev.round },
      data: {
        circuitId: enriched.circuitId ?? undefined,
        circuitImageUrl: enriched.circuitImageUrl ?? undefined,
        circuitSvgUrl: enriched.circuitSvgUrl ?? undefined,
      },
    });
    updated += 1;
  }
  return { checked: events.length, updated };
}

/**
 * Fuerza re-enriquecimiento de todos los eventos (p. ej. tras cambiar fuente SVG).
 */
export async function refreshAllSeasonCircuits(prisma, seasonId, seasonYear) {
  const events = await prisma.event.findMany({
    where: { seasonId },
    select: {
      round: true,
      circuitName: true,
      raceName: true,
      locality: true,
      country: true,
      circuitId: true,
    },
  });

  let updated = 0;
  for (const ev of events) {
    const enriched = await enrichCalendarRow(
      {
        circuitName: ev.circuitName,
        raceName: ev.raceName,
        locality: ev.locality,
        country: ev.country,
        circuitId: ev.circuitId,
        circuitImageUrl: null,
        circuitSvgUrl: null,
      },
      seasonYear,
    );
    if (!enriched.circuitSvgUrl && !enriched.circuitImageUrl) continue;
    await prisma.event.updateMany({
      where: { seasonId, round: ev.round },
      data: {
        circuitId: enriched.circuitId ?? undefined,
        circuitImageUrl: enriched.circuitImageUrl ?? undefined,
        circuitSvgUrl: enriched.circuitSvgUrl ?? undefined,
      },
    });
    updated += 1;
  }
  return { total: events.length, updated };
}
