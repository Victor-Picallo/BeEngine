/**
 * Sync MotoGP / Moto2 / Moto3 (Pulse) → Supabase
 * Uso: node scripts/sync/sync-moto.mjs motogp|moto2|moto3
 */
import 'dotenv/config';
import { createPrismaClient } from '../../src/lib/prisma.js';
import {
  fetchCalendar,
  fetchDriverStandings,
  fetchLastRace,
  fetchOfficialTeamsGrid,
  fetchRaceResultsByRound,
  fetchRoundSessionsMeta,
  listSyncableRounds,
} from '../../src/services/motogp/pulseLive.fetch.js';
import {
  pulseSessionToKey,
  sessionHasDisplayableData,
} from '../../src/services/motogp/motogpSessions.util.js';
import { pulseliveClient } from '../../src/external/motogp/pulselive.client.js';
import { categoryUuidFor } from '../../src/services/motogp/pulseLive.fetch.js';
import { currentSeasonYear } from '../../src/repositories/db/season.repository.js';
import {
  enrichCalendarRow,
  enrichSeasonEventsMissingCircuits,
} from '../../src/services/shared/circuitEnrichment.service.js';
import {
  aliasedLogoStorageCandidates,
  firstReachableUrl,
} from '../../src/services/motogp/motogpTeams.service.js';
import { MOTO2_DRIVERS_GRID_2026 } from '../../src/data/moto2/moto2DriversGrid2026.js';
import { MOTO2_CONSTRUCTORS_GRID_2026 } from '../../src/data/moto2/moto2ConstructorsGrid2026.js';
import { MOTO3_DRIVERS_GRID_2026 } from '../../src/data/moto3/moto3DriversGrid2026.js';
import { MOTO3_CONSTRUCTORS_GRID_2026 } from '../../src/data/moto3/moto3ConstructorsGrid2026.js';
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

const GRID_BY_CATEGORY = {
  moto2: { drivers: MOTO2_DRIVERS_GRID_2026, constructors: MOTO2_CONSTRUCTORS_GRID_2026 },
  moto3: { drivers: MOTO3_DRIVERS_GRID_2026, constructors: MOTO3_CONSTRUCTORS_GRID_2026 },
};

const categoryId = (process.argv[2] || 'motogp').toLowerCase();
if (!['motogp', 'moto2', 'moto3'].includes(categoryId)) {
  console.error('Usage: node scripts/sync/sync-moto.mjs motogp|moto2|moto3');
  process.exit(1);
}

const prisma = createPrismaClient();
if (!prisma) {
  console.error('DATABASE_URL no configurada');
  process.exit(1);
}

const SEASON_ID = seasonId(categoryId);

const slugId = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'unknown';

const normTeam = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Alinea constructorId de standings con la parrilla oficial (evita duplicados sin moto). */
const buildTeamResolver = (teams) => {
  const byId = new Map(teams.map((t) => [t.constructorId, t]));
  const byName = new Map(teams.map((t) => [normTeam(t.team), t.constructorId]));
  return (row) => {
    const fromRow = row.constructorId || slugId(row.team);
    if (byId.has(fromRow)) return fromRow;
    const byExactName = byName.get(normTeam(row.team));
    if (byExactName) return byExactName;
    const fuzzy = teams.find(
      (t) =>
        fromRow.includes(t.constructorId) ||
        t.constructorId.includes(fromRow) ||
        normTeam(row.team) === normTeam(t.team),
    );
    return fuzzy?.constructorId ?? fromRow;
  };
};

const asList = (raw) => (Array.isArray(raw) ? raw : raw?.value ?? []);

async function syncFromPulse() {
  const year = currentSeasonYear();
  const calendar = await fetchCalendar(categoryId);
  let circuitsEnriched = 0;
  for (const raw of calendar) {
    const r = await enrichCalendarRow(raw, year, { seasonId: SEASON_ID });
    if (r.circuitImageUrl || r.circuitSvgUrl) circuitsEnriched += 1;
    await upsertCalendarEvent(prisma, SEASON_ID, r);
  }

  const teams = await fetchOfficialTeamsGrid(categoryId);
  const resolveConstructorId = buildTeamResolver(teams);
  const resolveLogoUrl = async (constructorId, logoUrl) => {
    if (logoUrl) return logoUrl;
    if (categoryId !== 'motogp') return null;
    return firstReachableUrl(aliasedLogoStorageCandidates(categoryId, constructorId));
  };
  for (const t of teams) {
    await upsertConstructor(prisma, SEASON_ID, t.constructorId, t.team, {
      externalId: t.teamId != null ? String(t.teamId) : null,
      teamColor: t.teamColor ?? null,
      logoUrl: await resolveLogoUrl(t.constructorId, t.logoUrl ?? null),
      bikeImageUrl: t.bikeImageUrl ?? null,
    });
    await upsertConstructorStanding(prisma, SEASON_ID, {
      pos: t.pos,
      constructorId: t.constructorId,
      points: t.points,
      wins: t.wins ?? 0,
    });
  }

  const drivers = await fetchDriverStandings(categoryId);
  for (const row of drivers) {
    const parts = row.driver.split(' ');
    const constructorId = resolveConstructorId(row);
    const official = teams.find((t) => t.constructorId === constructorId);
    await upsertConstructor(prisma, SEASON_ID, constructorId, row.team, {
      externalId: row.teamId != null ? String(row.teamId) : null,
      teamColor: row.teamColor ?? official?.teamColor ?? null,
      logoUrl:
        (await resolveLogoUrl(
          constructorId,
          official?.logoUrl ?? row.logoUrl ?? null,
        )) ?? null,
      bikeImageUrl: official?.bikeImageUrl ?? null,
    });
    await upsertDriverEntry(prisma, SEASON_ID, {
      driverId: row.driverId,
      givenName: parts[0] ?? '',
      familyName: parts.slice(1).join(' ') || '',
      nationality: row.nationality ?? '',
      displayName: row.driver,
      teamName: row.team,
      constructorId,
      gridOrder: row.pos,
      headshotUrl: row.headshotUrl ?? null,
    });
    await upsertDriverStanding(prisma, SEASON_ID, {
      driverId: row.driverId,
      pos: row.pos,
      points: row.points,
      wins: row.wins ?? 0,
    });
  }

  const { finishedRounds, events } = await listSyncableRounds(categoryId);
  let races = 0;
  let sessionsMeta = 0;

  for (const round of finishedRounds) {
    try {
      const meta = await fetchRoundSessionsMeta(round, categoryId);
      await upsertRaceSession(prisma, SEASON_ID, round, '_sessions', meta);
      sessionsMeta += 1;
    } catch (e) {
      console.warn(`  sessions round ${round} skip:`, e.message);
    }

    const event = events[round - 1];
    if (!event?.id) continue;

    const pulseSessions = asList(
      await pulseliveClient.get(
        `/results/sessions?eventUuid=${event.id}&categoryUuid=${categoryUuidFor(categoryId)}`,
      ),
    );

    for (const s of pulseSessions) {
      if (!sessionHasDisplayableData(s)) continue;
      const key = pulseSessionToKey(s);
      try {
        const payload = await fetchRaceResultsByRound(round, key, categoryId);
        if (!payload?.results?.length && key !== 'race') continue;
        await upsertRaceSession(prisma, SEASON_ID, round, key, payload);
        if (key === 'race') {
          races += 1;
          console.log(`  race round ${round} OK`);
        }
      } catch (e) {
        if (key === 'race') console.warn(`  race round ${round} skip:`, e.message);
      }
    }
  }

  try {
    const last = await fetchLastRace(categoryId);
    if (last?.round && last.results?.length) {
      await upsertRaceSession(prisma, SEASON_ID, last.round, 'race', last);
    }
  } catch (e) {
    console.warn('  last race skip:', e.message);
  }

  const circuitFill = await enrichSeasonEventsMissingCircuits(prisma, SEASON_ID, year);

  const grid = GRID_BY_CATEGORY[categoryId];
  let prunedDrivers = 0;
  let prunedConstructors = 0;
  const constructorIds =
    grid?.constructors.map((c) => c.constructorId) ?? teams.map((t) => t.constructorId);
  if (grid || categoryId === 'motogp') {
    const driverIds = grid?.drivers.map((d) => d.driverId) ?? drivers.map((d) => d.driverId);
    if (driverIds.length) {
      const pe = await prisma.driverSeasonEntry.deleteMany({
        where: { seasonId: SEASON_ID, driverId: { notIn: driverIds } },
      });
      const ps = await prisma.driverStanding.deleteMany({
        where: { seasonId: SEASON_ID, driverId: { notIn: driverIds } },
      });
      prunedDrivers = pe.count + ps.count;
    }
    if (constructorIds.length) {
      const pc = await prisma.constructorSeason.deleteMany({
        where: { seasonId: SEASON_ID, constructorId: { notIn: constructorIds } },
      });
      const pcs = await prisma.constructorStanding.deleteMany({
        where: { seasonId: SEASON_ID, constructorId: { notIn: constructorIds } },
      });
      prunedConstructors = pc.count + pcs.count;
    }
  }

  return {
    events: calendar.length,
    circuitsEnriched,
    circuitsBackfill: circuitFill.updated,
    teams: teams.length,
    drivers: drivers.length,
    finishedRounds: finishedRounds.length,
    races,
    sessionsMeta,
    prunedDrivers,
    prunedConstructors,
  };
}

const weekendOnly = process.argv.includes('--weekend');

async function main() {
  const run = await startSyncRun(prisma, categoryId, 'pulse');
  console.log(`${categoryId} sync → ${SEASON_ID}${weekendOnly ? ' (weekend)' : ''}`);

  try {
    await ensureSeries(prisma, categoryId);
    const data = await syncFromPulse();
    console.log('  pulse', data);
    await finishSyncRun(prisma, run.id, 'success', data);
    console.log(`${categoryId} sync done.`);
  } catch (e) {
    await finishSyncRun(prisma, run.id, 'failed', null, e.message);
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
