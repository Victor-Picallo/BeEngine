import { currentSeasonYear } from '../../repositories/db/season.repository.js';
import { resolveFormulaCircuitAssets } from '../../data/shared/formulaCircuitAssets.js';
import { findCircuitByName, getCircuitById } from '../motogp/motogpCircuits.service.js';
import { isPulseSectorCircuitUrl } from '../motogp/motogpCircuitMedia.js';

const FORMULA_SERIES = new Set(['f1', 'f2', 'f3']);
const MOTO_SERIES = new Set(['motogp', 'moto2', 'moto3']);

export function isFormulaSeasonId(seasonId) {
  const series = String(seasonId ?? '').split('_')[0];
  return FORMULA_SERIES.has(series);
}

export function isMotoSeasonId(seasonId) {
  const series = String(seasonId ?? '').split('_')[0];
  return MOTO_SERIES.has(series);
}

async function enrichMotoCalendarRow(row, seasonYear) {
  let c = null;
  const circuitId = String(row.circuitId ?? '').trim();
  if (circuitId) {
    c = await getCircuitById(circuitId, seasonYear);
  }
  if (!c && row.circuitName) {
    c = await findCircuitByName(row.circuitName, seasonYear);
  }
  if (!c) return { ...row };

  const simple = c.imageUrl ?? null;
  const infoSvg = c.svgUrl && isPulseSectorCircuitUrl(c.svgUrl) ? c.svgUrl : null;

  return {
    ...row,
    circuitId: row.circuitId ?? String(c.circuitId ?? ''),
    circuitImageUrl: simple ?? row.circuitImageUrl ?? null,
    circuitSvgUrl: infoSvg ?? row.circuitSvgUrl ?? null,
  };
}

/**
 * Enriquece filas de calendario con SVG de circuito.
 * @param {object} row
 * @param {number} [seasonYear]
 * @param {{ formulaOnly?: boolean }} [opts] F1/F2/F3: solo coggs/f1_svg (sin Pulse/MotoGP).
 */
export async function enrichCalendarRow(row, seasonYear = currentSeasonYear(), opts = {}) {
  const formulaOnly = opts.formulaOnly === true;
  const seasonId = opts.seasonId ?? null;
  const isMoto = opts.motoOnly === true || (seasonId && isMotoSeasonId(seasonId));

  if (isMoto) {
    try {
      return await enrichMotoCalendarRow(row, seasonYear);
    } catch {
      return { ...row };
    }
  }

  let out = { ...row };

  const formula = resolveFormulaCircuitAssets(row);
  if (formula) {
    out = {
      ...out,
      circuitId: out.circuitId ?? formula.circuitId ?? null,
      circuitSvgUrl: formula.circuitSvgUrl,
      circuitImageUrl: formula.circuitImageUrl ?? formula.circuitSvgUrl,
    };
    if (formulaOnly) return out;
  }

  if (out.circuitImageUrl && out.circuitSvgUrl) return out;

  if (formulaOnly) return out;

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
  const formulaOnly = isFormulaSeasonId(seasonId);
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
      { formulaOnly, seasonId },
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
  const formulaOnly = isFormulaSeasonId(seasonId);
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
      { formulaOnly, seasonId },
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
