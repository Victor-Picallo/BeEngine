/**
 * Auditoría rápida de medios en DB (sin Prisma Studio).
 * Uso: npm run verify:media
 *      npm run verify:media -- --formula --strict
 *      npm run verify:media -- --moto --strict
 *      npm run verify:media -- --strict          (las 6 series)
 */
import 'dotenv/config';
import { createPrismaClient } from '../src/lib/prisma.js';
import { seasonIdFor, currentSeasonYear } from '../src/repositories/db/season.repository.js';
import { SUPABASE_STORAGE_PUBLIC_BASE } from '../src/config/env.js';

const argv = process.argv.slice(2);
const formulaOnly = argv.includes('--formula');
const motoOnly = argv.includes('--moto');
const strict = argv.includes('--strict');

const isBucketUrl = (url) =>
  Boolean(url && SUPABASE_STORAGE_PUBLIC_BASE && String(url).startsWith(SUPABASE_STORAGE_PUBLIC_BASE));

const requireBucket = formulaOnly || motoOnly || strict;

const circuitComplete = (e) =>
  requireBucket
    ? isBucketUrl(e.circuitImageUrl) && isBucketUrl(e.circuitSvgUrl)
    : Boolean(e.circuitImageUrl && e.circuitSvgUrl && String(e.circuitImageUrl).startsWith('http'));

const ALL_SERIES = ['f1', 'f2', 'f3', 'motogp', 'moto2', 'moto3'];
const FORMULA_SERIES = ['f1', 'f2', 'f3'];
const MOTO_SERIES = ['motogp', 'moto2', 'moto3'];
const SERIES = formulaOnly ? FORMULA_SERIES : motoOnly ? MOTO_SERIES : ALL_SERIES;
const year = currentSeasonYear();

const prisma = createPrismaClient();
if (!prisma) {
  console.error('DATABASE_URL no configurada');
  process.exit(1);
}

async function auditSeries(seriesId) {
  const seasonId = seasonIdFor(seriesId, year);
  const [events, drivers, constructors] = await Promise.all([
    prisma.event.findMany({
      where: { seasonId },
      select: { circuitImageUrl: true, circuitSvgUrl: true },
    }),
    prisma.driverSeasonEntry.findMany({
      where: { seasonId },
      select: { driverId: true, headshotUrl: true, driver: { select: { headshotUrl: true } } },
    }),
    prisma.constructorSeason.findMany({
      where: { seasonId },
      select: { constructorId: true, logoUrl: true, bikeImageUrl: true, name: true },
    }),
  ]);

  const withCircuit = events.filter((e) => circuitComplete(e)).length;
  const headshots = drivers.filter(
    (d) => isBucketUrl(d.headshotUrl) || isBucketUrl(d.driver?.headshotUrl),
  ).length;
  const logos = constructors.filter((c) => isBucketUrl(c.logoUrl)).length;
  const bikes = constructors.filter((c) => isBucketUrl(c.bikeImageUrl)).length;

  return {
    seriesId,
    events: events.length,
    circuits: withCircuit,
    drivers: drivers.length,
    headshots,
    logos,
    bikes,
    constructors: constructors.length,
    missingLogos: constructors
      .filter((c) => !isBucketUrl(c.logoUrl))
      .map((c) => c.name || c.constructorId),
    missingBikes: constructors
      .filter((c) => !isBucketUrl(c.bikeImageUrl))
      .map((c) => c.name || c.constructorId),
  };
}

function checkSeriesComplete(r) {
  const issues = [];
  if (r.events > 0 && r.circuits < r.events) {
    issues.push(`circuitos ${r.circuits}/${r.events}`);
  }
  if (r.drivers > 0 && r.headshots < r.drivers) {
    issues.push(`retratos ${r.headshots}/${r.drivers}`);
  }
  if (r.constructors > 0 && r.logos < r.constructors) {
    issues.push(`logos ${r.logos}/${r.constructors}`);
  }
  if (r.constructors > 0 && r.bikes < r.constructors) {
    issues.push(`motos ${r.bikes}/${r.constructors}`);
  }
  return issues;
}

const modeLabel = formulaOnly ? 'formula' : motoOnly ? 'moto' : strict ? 'completa' : null;

async function main() {
  console.log(`\nBeEngine media audit (${year})${modeLabel ? ` — ${modeLabel}` : ''}\n`);
  const rows = [];
  for (const s of SERIES) {
    rows.push(await auditSeries(s));
  }

  let failed = false;
  const auditThese = formulaOnly
    ? FORMULA_SERIES
    : motoOnly
      ? MOTO_SERIES
      : strict
        ? ALL_SERIES
        : null;

  for (const r of rows) {
    const pct = r.events > 0 ? Math.round((r.circuits / r.events) * 100) : 100;
    const line =
      `${r.seriesId.padEnd(7)} events=${r.events} circuits=${r.circuits}/${r.events} (${pct}%) ` +
      `headshots=${r.headshots}/${r.drivers} logos=${r.logos}/${r.constructors} motos=${r.bikes}/${r.constructors}`;
    console.log(line);

    const shouldCheck = auditThese ? auditThese.includes(r.seriesId) : false;
    if (shouldCheck) {
      const issues = checkSeriesComplete(r);
      if (issues.length) {
        console.log(`         ⚠ falta: ${issues.join(', ')}`);
        if (r.missingLogos?.length) {
          console.log(`           logos: ${r.missingLogos.join(', ')}`);
        }
        if (r.missingBikes?.length) {
          console.log(`           motos: ${r.missingBikes.join(', ')}`);
        }
        if (strict || formulaOnly || motoOnly) failed = true;
      } else if (r.events > 0 || r.drivers > 0) {
        console.log('         ✓ completo');
      }
    }
  }

  if (!formulaOnly && !motoOnly) {
    const formula = rows.filter((r) => FORMULA_SERIES.includes(r.seriesId));
    const lowCircuits = formula.filter((r) => r.events > 0 && r.circuits < r.events);
    if (lowCircuits.length) {
      console.log('\n⚠ Circuitos F1/F2/F3: npm run refresh:formula');
    }
    const moto = rows.filter((r) => MOTO_SERIES.includes(r.seriesId));
    const lowMoto = moto.filter(
      (r) =>
        (r.events > 0 && r.circuits < r.events) ||
        (r.drivers > 0 && r.headshots < r.drivers) ||
        (r.constructors > 0 && r.bikes < r.constructors),
    );
    if (lowMoto.length) {
      console.log('\n⚠ Moto: npm run refresh:moto');
    }
  }

  console.log('');
  if (failed) {
    const cmd = formulaOnly ? 'refresh:formula' : motoOnly ? 'refresh:moto' : 'refresh';
    const label = modeLabel ?? 'completa';
    console.error(`Auditoría ${label}: NO 100%. Ejecuta: npm run ${cmd}\n`);
    process.exit(1);
  }
  if (formulaOnly) {
    console.log('Auditoría formula: OK (100%)\n');
  } else if (motoOnly) {
    console.log('Auditoría moto: OK (100%)\n');
  } else if (strict) {
    console.log('Auditoría completa (6 series): OK (100%)\n');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
