/**
 * Sync F2 / F3 (FIA) → Supabase
 * Uso: node scripts/sync/sync-feeder.mjs f2|f3
 */
import 'dotenv/config';
import { createPrismaClient } from '../../src/lib/prisma.js';
import { createFiaFeederApi } from '../../src/services/shared/fiaFeederApi.service.js';
import { FIA_F2_BASE_URL, FIA_F2_SEASON_ID, FIA_F3_BASE_URL, FIA_F3_SEASON_ID } from '../../src/config/env.js';
import { F2_DRIVERS_GRID_2026 } from '../../src/data/f2/f2DriversGrid2026.js';
import { F2_CONSTRUCTORS_GRID_2026 } from '../../src/data/f2/f2ConstructorsGrid2026.js';
import { F3_DRIVERS_GRID_2026 } from '../../src/data/f3/f3DriversGrid2026.js';
import { F3_CONSTRUCTORS_GRID_2026 } from '../../src/data/f3/f3ConstructorsGrid2026.js';
import {
  ensureSeries,
  finishSyncRun,
  seasonId,
  startSyncRun,
  upsertCalendarEvent,
  upsertConstructor,
  upsertConstructorStanding,
  upsertDriverEntry,
  upsertDriverStanding,
  upsertRaceSession,
} from './sync-db-helpers.mjs';
import {
  enrichCalendarRow,
  enrichSeasonEventsMissingCircuits,
} from '../../src/services/shared/circuitEnrichment.service.js';
import { currentSeasonYear } from '../../src/repositories/db/season.repository.js';

const seriesArg = (process.argv[2] || 'f2').toLowerCase();
const CONFIG = {
  f2: {
    baseUrl: FIA_F2_BASE_URL,
    fiaSeasonId: FIA_F2_SEASON_ID,
    driversGrid: F2_DRIVERS_GRID_2026,
    constructorsGrid: F2_CONSTRUCTORS_GRID_2026,
  },
  f3: {
    baseUrl: FIA_F3_BASE_URL,
    fiaSeasonId: FIA_F3_SEASON_ID,
    driversGrid: F3_DRIVERS_GRID_2026,
    constructorsGrid: F3_CONSTRUCTORS_GRID_2026,
  },
};

const cfg = CONFIG[seriesArg];
if (!cfg) {
  console.error('Usage: node scripts/sync/sync-feeder.mjs f2|f3');
  process.exit(1);
}

const prisma = createPrismaClient();
if (!prisma) {
  console.error('DATABASE_URL no configurada');
  process.exit(1);
}

const SERIES_ID = seriesArg;
const SEASON_ID = seasonId(SERIES_ID);

const slug = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'unknown';

const teamToConstructor = (team) =>
  cfg.constructorsGrid.find((c) => c.team === team)?.constructorId ?? slug(team);

async function syncGrid() {
  for (const c of cfg.constructorsGrid) {
    await upsertConstructor(prisma, SEASON_ID, c.constructorId, c.team);
  }
  for (const d of cfg.driversGrid) {
    const parts = d.driver.split(' ');
    await upsertDriverEntry(prisma, SEASON_ID, {
      driverId: d.driverId,
      givenName: d.givenName ?? parts[0],
      familyName: d.familyName ?? parts.slice(1).join(' '),
      nationality: d.nationality,
      displayName: d.driver,
      teamName: d.team,
      constructorId: teamToConstructor(d.team) || slug(d.team),
      gridOrder: d.gridOrder,
    });
  }
  return { drivers: cfg.driversGrid.length, constructors: cfg.constructorsGrid.length };
}

async function syncFromApi(api) {
  const cal = await api.getCalendar();
  const year = currentSeasonYear();
  let circuitsEnriched = 0;
  for (const raw of cal.items) {
    const r = await enrichCalendarRow(
      {
        round: raw.round,
        raceName: raw.raceName,
        circuitName: raw.circuitName,
        locality: raw.locality,
        country: raw.country,
        date: raw.date,
        time: raw.time,
        resultsAvailable: raw.resultsAvailable,
        externalEventId: raw.fiaRaceId,
      },
      year,
      { formulaOnly: true },
    );
    if (r.circuitImageUrl || r.circuitSvgUrl) circuitsEnriched += 1;
    await upsertCalendarEvent(prisma, SEASON_ID, r);
  }

  const ds = await api.getDriverStandings();
  for (const row of ds.items) {
    const grid = cfg.driversGrid.find((g) => g.driverId === row.driverId);
    const parts = row.driver.split(' ');
    const constructorId =
      row.constructorId || teamToConstructor(row.team) || `team_${slug(row.team)}`;
    await upsertConstructor(prisma, SEASON_ID, constructorId, row.team);
    await upsertDriverEntry(prisma, SEASON_ID, {
      driverId: row.driverId,
      givenName: grid?.givenName ?? parts[0],
      familyName: grid?.familyName ?? parts.slice(1).join(' '),
      nationality: row.nationality ?? grid?.nationality,
      displayName: row.driver,
      teamName: row.team,
      constructorId,
      gridOrder: grid?.gridOrder ?? row.pos,
    });
    await upsertDriverStanding(prisma, SEASON_ID, row);
  }

  const cs = await api.getConstructorStandings();
  for (const row of cs.items) {
    await upsertConstructor(prisma, SEASON_ID, row.constructorId, row.team);
    await upsertConstructorStanding(prisma, SEASON_ID, row);
  }

  const completed = cal.items.filter((r) => r.resultsAvailable).map((r) => r.round);
  let races = 0;
  for (const round of completed) {
    try {
      const race = await api.getRaceResultsByRound(round, { allowLive: true });
      await upsertRaceSession(prisma, SEASON_ID, round, 'race', {
        round: race.round,
        raceName: race.raceName,
        circuitName: race.circuitName,
        date: race.date,
        results: race.results,
        live: race.live,
        sessionPending: race.sessionPending,
      });
      races += 1;
      console.log(`  race round ${round} OK`);
    } catch (e) {
      console.warn(`  race round ${round} skip:`, e.message);
    }
  }

  const circuitFill = await enrichSeasonEventsMissingCircuits(prisma, SEASON_ID, year);

  const gridIds = cfg.driversGrid.map((d) => d.driverId);
  const prunedEntries = await prisma.driverSeasonEntry.deleteMany({
    where: { seasonId: SEASON_ID, driverId: { notIn: gridIds } },
  });
  const prunedStandings = await prisma.driverStanding.deleteMany({
    where: { seasonId: SEASON_ID, driverId: { notIn: gridIds } },
  });

  const constructorIds = cfg.constructorsGrid.map((c) => c.constructorId);
  const prunedConstructors = await prisma.constructorSeason.deleteMany({
    where: { seasonId: SEASON_ID, constructorId: { notIn: constructorIds } },
  });
  const prunedConstructorStandings = await prisma.constructorStanding.deleteMany({
    where: { seasonId: SEASON_ID, constructorId: { notIn: constructorIds } },
  });

  return {
    events: cal.items.length,
    circuitsEnriched,
    circuitsBackfill: circuitFill.updated,
    drivers: ds.items.length,
    constructors: cs.items.length,
    races,
    prunedDrivers: prunedEntries.count + prunedStandings.count,
    prunedConstructors: prunedConstructors.count + prunedConstructorStandings.count,
  };
}

const weekendOnly = process.argv.includes('--weekend');

async function main() {
  const run = await startSyncRun(prisma, SERIES_ID, 'fia');
  console.log(`${SERIES_ID.toUpperCase()} sync → ${SEASON_ID}${weekendOnly ? ' (weekend)' : ''}`);

  try {
    await ensureSeries(prisma, SERIES_ID);
    const api = createFiaFeederApi({
      baseUrl: cfg.baseUrl,
      seasonId: cfg.fiaSeasonId,
      driversGrid: cfg.driversGrid,
      constructorsGrid: cfg.constructorsGrid,
    });

    let grid = null;
    if (!weekendOnly) {
      grid = await syncGrid();
      console.log('  grid', grid);
    }
    const data = await syncFromApi(api);
    console.log('  api', data);

    await finishSyncRun(prisma, run.id, 'success', { grid, data });
    console.log(`${SERIES_ID.toUpperCase()} sync done.`);
  } catch (e) {
    await finishSyncRun(prisma, run.id, 'failed', null, e.message);
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
