/**
 * Sincroniza F1 (Jolpica) → Supabase. Uso: npm run db:sync:f1
 */
import 'dotenv/config';
import { createPrismaClient } from '../../src/lib/prisma.js';
import { seasonIdFor, currentSeasonYear } from '../../src/repositories/db/season.repository.js';
import {
  fetchLastCompletedRound,
  fetchLiveCalendar,
  fetchLiveConstructorStandings,
  fetchLiveDriverStandings,
  fetchLiveRaceResultsByRound,
} from '../../src/services/f1/jolpica.live.js';
import { F1_DRIVERS_GRID_2026 } from '../../src/data/f1/f1DriversGrid2026.js';
import { F1_CONSTRUCTORS_GRID_2026 } from '../../src/data/f1/f1ConstructorsGrid2026.js';
import { manualConstructorStandingRows } from '../../src/data/f1/f1ManualConstructors.js';
import { upsertCalendarEvent } from './sync-db-helpers.mjs';
import {
  enrichCalendarRow,
  enrichSeasonEventsMissingCircuits,
} from '../../src/services/shared/circuitEnrichment.service.js';

const prisma = createPrismaClient();
if (!prisma) {
  console.error('DATABASE_URL no configurada');
  process.exit(1);
}

const SERIES_ID = 'f1';
const SEASON_ID = seasonIdFor(SERIES_ID, currentSeasonYear());

async function startSyncRun() {
  return prisma.syncRun.create({
    data: { seriesId: SERIES_ID, source: 'jolpica', status: 'running' },
  });
}

async function finishSyncRun(id, status, meta, error = null) {
  await prisma.syncRun.update({
    where: { id },
    data: { status, finishedAt: new Date(), meta, error },
  });
}

async function ensureSeason() {
  await prisma.series.upsert({
    where: { id: SERIES_ID },
    create: {
      id: SERIES_ID,
      label: 'Formula 1',
      short: 'F1',
      accent: '#FFD100',
    },
    update: {},
  });
  await prisma.season.upsert({
    where: { id: SEASON_ID },
    create: { id: SEASON_ID, seriesId: SERIES_ID, year: currentSeasonYear() },
    update: {},
  });
}

async function syncGrid() {
  for (const c of F1_CONSTRUCTORS_GRID_2026) {
    await prisma.constructor.upsert({
      where: { id: c.constructorId },
      create: { id: c.constructorId },
      update: {},
    });
    await prisma.constructorSeason.upsert({
      where: {
        seasonId_constructorId: { seasonId: SEASON_ID, constructorId: c.constructorId },
      },
      create: {
        seasonId: SEASON_ID,
        constructorId: c.constructorId,
        name: c.team,
      },
      update: { name: c.team },
    });
  }

  for (const d of F1_DRIVERS_GRID_2026) {
    const teamName = d.team;
    const constructorId =
      F1_CONSTRUCTORS_GRID_2026.find((c) => c.team === teamName)?.constructorId ?? 'unknown';

    await prisma.driver.upsert({
      where: { id: d.driverId },
      create: {
        id: d.driverId,
        givenName: d.givenName,
        familyName: d.familyName,
        nationality: d.nationality?.slice(0, 8) ?? null,
      },
      update: {
        givenName: d.givenName,
        familyName: d.familyName,
        nationality: d.nationality?.slice(0, 8) ?? null,
      },
    });

    await prisma.driverSeasonEntry.upsert({
      where: { seasonId_driverId: { seasonId: SEASON_ID, driverId: d.driverId } },
      create: {
        seasonId: SEASON_ID,
        driverId: d.driverId,
        constructorId,
        displayName: d.driver,
        teamName,
        gridOrder: d.gridOrder,
      },
      update: {
        constructorId,
        displayName: d.driver,
        teamName,
        gridOrder: d.gridOrder,
      },
    });
  }

  return { drivers: F1_DRIVERS_GRID_2026.length, constructors: F1_CONSTRUCTORS_GRID_2026.length };
}

async function syncCalendar() {
  const items = await fetchLiveCalendar();
  const year = currentSeasonYear();
  let count = 0;
  let circuitsEnriched = 0;
  for (const raw of items) {
    const r = await enrichCalendarRow(raw, year, { formulaOnly: true });
    if (r.circuitImageUrl || r.circuitSvgUrl) circuitsEnriched += 1;
    await upsertCalendarEvent(prisma, SEASON_ID, r);
    count += 1;
  }
  return {
    events: count,
    circuitsEnriched,
    lastRound: await fetchLastCompletedRound(),
  };
}

async function syncDriverStandings() {
  const items = await fetchLiveDriverStandings();
  for (const row of items) {
    const parts = row.driver.split(' ');
    const givenName = parts[0] ?? '';
    const familyName = parts.slice(1).join(' ') || '';
    if (!row.driverId) continue;

    const grid = F1_DRIVERS_GRID_2026.find((g) => g.driverId === row.driverId);
    const constructorId =
      F1_CONSTRUCTORS_GRID_2026.find((c) => c.team === row.team)?.constructorId ??
      (grid ? F1_CONSTRUCTORS_GRID_2026.find((c) => c.team === grid.team)?.constructorId : null) ??
      'unknown';

    await prisma.driver.upsert({
      where: { id: row.driverId },
      create: {
        id: row.driverId,
        givenName,
        familyName,
        nationality: (row.nationality ?? '').slice(0, 8) || null,
      },
      update: { givenName, familyName, nationality: (row.nationality ?? '').slice(0, 8) || null },
    });

    await prisma.driverStanding.upsert({
      where: {
        seasonId_driverId: { seasonId: SEASON_ID, driverId: row.driverId },
      },
      create: {
        seasonId: SEASON_ID,
        driverId: row.driverId,
        position: row.pos,
        points: row.points,
        wins: row.wins,
      },
      update: {
        position: row.pos,
        points: row.points,
        wins: row.wins,
      },
    });
  }
  return { rows: items.length };
}

async function syncConstructorStandings() {
  let items = await fetchLiveConstructorStandings();
  const seen = new Set(items.map((r) => r.constructorId));
  for (const m of manualConstructorStandingRows()) {
    if (!seen.has(m.constructorId)) {
      items = [...items, m];
      seen.add(m.constructorId);
    }
  }

  for (const row of items) {
    await prisma.constructor.upsert({
      where: { id: row.constructorId },
      create: { id: row.constructorId },
      update: {},
    });
    await prisma.constructorSeason.upsert({
      where: {
        seasonId_constructorId: { seasonId: SEASON_ID, constructorId: row.constructorId },
      },
      create: {
        seasonId: SEASON_ID,
        constructorId: row.constructorId,
        name: row.team,
      },
      update: { name: row.team },
    });
    await prisma.constructorStanding.upsert({
      where: {
        seasonId_constructorId: { seasonId: SEASON_ID, constructorId: row.constructorId },
      },
      create: {
        seasonId: SEASON_ID,
        constructorId: row.constructorId,
        position: row.pos,
        points: row.points,
        wins: row.wins,
      },
      update: {
        position: row.pos,
        points: row.points,
        wins: row.wins,
      },
    });
  }
  return { rows: items.length };
}

async function syncRaceResults(lastRound) {
  const maxRound = lastRound || (await fetchLastCompletedRound());
  let synced = 0;
  for (let round = 1; round <= maxRound; round += 1) {
    try {
      const race = await fetchLiveRaceResultsByRound(round);
      const event = await prisma.event.findUnique({
        where: { seasonId_round: { seasonId: SEASON_ID, round } },
      });
      const eventId =
        event?.id ??
        (
          await prisma.event.create({
            data: {
              seasonId: SEASON_ID,
              round,
              raceName: race.raceName,
              circuitName: race.circuitName,
              date: race.date,
              resultsAvailable: true,
            },
          })
        ).id;

      await prisma.event.update({
        where: { id: eventId },
        data: { resultsAvailable: true },
      });

      await prisma.sessionResult.upsert({
        where: {
          eventId_sessionKey: { eventId, sessionKey: 'race' },
        },
        create: {
          eventId,
          sessionKey: 'race',
          payload: race,
        },
        update: { payload: race },
      });
      synced += 1;
      console.log(`  race round ${round} OK`);
    } catch (e) {
      console.warn(`  race round ${round} skip:`, e.message);
    }
  }
  return { races: synced };
}

const weekendOnly = process.argv.includes('--weekend');

async function main() {
  const year = currentSeasonYear();
  const run = await startSyncRun();
  console.log(`F1 sync → ${SEASON_ID}${weekendOnly ? ' (weekend)' : ''}`);

  try {
    await ensureSeason();
    let grid = null;
    if (!weekendOnly) {
      grid = await syncGrid();
      console.log('  grid', grid);
    }

    const cal = await syncCalendar();
    console.log('  calendar', cal);

    const circuitFill = await enrichSeasonEventsMissingCircuits(prisma, SEASON_ID, year);
    console.log('  circuits backfill', circuitFill);

    const ds = await syncDriverStandings();
    console.log('  driver standings', ds);

    const cs = await syncConstructorStandings();
    console.log('  constructor standings', cs);

    const races = await syncRaceResults(cal.lastRound);
    console.log('  results', races);

    await finishSyncRun(run.id, 'success', { grid, cal, ds, cs, races });
    console.log('F1 sync done.');
  } catch (e) {
    await finishSyncRun(run.id, 'failed', null, e.message);
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
