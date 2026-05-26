import { requirePrisma } from '../../lib/prisma.js';
import { seasonIdFor } from './season.repository.js';
import { mergeDriverStandingsWithGrid } from './mappers/f1.mappers.js';
import { resolveFormulaMediaUrl } from '../../services/shared/formulaMedia.js';

const seasonId = (seriesId) => seasonIdFor(seriesId);

export async function getCalendarFromDb(seriesId) {
  const prisma = requirePrisma();
  const rows = await prisma.event.findMany({
    where: { seasonId: seasonId(seriesId) },
    orderBy: { round: 'asc' },
  });
  if (!rows.length) return null;
  return rows.map((e) => ({
    round: e.round,
    raceName: e.raceName,
    circuitName: e.circuitName ?? '',
    locality: e.locality ?? '',
    country: e.country ?? '',
    date: e.date ?? '',
    time: e.time ?? null,
    resultsAvailable: e.resultsAvailable === true,
    circuitId: e.circuitId ?? null,
    circuitImageUrl: e.circuitImageUrl ?? null,
    circuitSvgUrl: e.circuitSvgUrl ?? null,
  }));
}

export async function getDriverStandingsFromDb(seriesId) {
  const prisma = requirePrisma();
  const sid = seasonId(seriesId);
  const [standings, grid] = await Promise.all([
    prisma.driverStanding.findMany({
      where: { seasonId: sid },
      include: { driver: true },
      orderBy: { position: 'asc' },
    }),
    prisma.driverSeasonEntry.findMany({
      where: { seasonId: sid },
      orderBy: { gridOrder: 'asc' },
    }),
  ]);
  if (!grid.length && !standings.length) return null;

  const standingRows = standings.map((row) => {
    const entry = grid.find((g) => g.driverId === row.driverId);
    const d = row.driver;
    const name =
      entry?.displayName ??
      (d.givenName && d.familyName
        ? `${d.givenName} ${d.familyName}`.trim()
        : row.driverId);
    return {
      pos: row.position,
      driver: name,
      driverId: row.driverId,
      team: entry?.teamName ?? '',
      points: row.points,
      wins: row.wins,
      nationality: d.nationality ?? '',
      headshotUrl: resolveFormulaMediaUrl(
        seriesId,
        row.driverId,
        'headshot',
        entry?.headshotUrl ?? d.headshotUrl,
      ),
    };
  });

  const gridMapped = grid.map((g) => ({
    driverId: g.driverId,
    displayName: g.displayName,
    teamName: g.teamName,
    gridOrder: g.gridOrder,
    nationality: '',
  }));

  return mergeDriverStandingsWithGrid(standingRows, gridMapped);
}

export async function getConstructorStandingsFromDb(seriesId) {
  const prisma = requirePrisma();
  const sid = seasonId(seriesId);
  const rows = await prisma.constructorStanding.findMany({
    where: { seasonId: sid },
    include: {
      constructor: {
        include: { seasons: { where: { seasonId: sid }, take: 1 } },
      },
    },
    orderBy: { position: 'asc' },
  });
  if (!rows.length) return null;
  return rows.map((row) => {
    const cs = row.constructor.seasons[0];
    return {
      pos: row.position,
      team: cs?.name ?? row.constructorId,
      constructorId: row.constructorId,
      points: row.points,
      wins: row.wins,
      nationality: '',
      teamColor: cs?.teamColor ?? null,
      logoUrl: resolveFormulaMediaUrl(seriesId, row.constructorId, 'logo', cs?.logoUrl),
      bikeImageUrl: resolveFormulaMediaUrl(seriesId, row.constructorId, 'car', cs?.bikeImageUrl),
    };
  });
}

export async function getLastRaceFromDb(seriesId) {
  const prisma = requirePrisma();
  const sid = seasonId(seriesId);
  const lastEvent = await prisma.event.findFirst({
    where: { seasonId: sid, resultsAvailable: true },
    orderBy: { round: 'desc' },
    include: { sessionResults: { where: { sessionKey: 'race' }, take: 1 } },
  });
  if (!lastEvent?.sessionResults[0]) return null;
  const payload = lastEvent.sessionResults[0].payload;
  if (!payload || typeof payload !== 'object') return null;
  return { ...payload, round: lastEvent.round, imageUrl: null };
}

export async function findDriverSeasonEntry(seriesId, driverId) {
  const prisma = requirePrisma();
  const sid = seasonId(seriesId);
  const entry = await prisma.driverSeasonEntry.findUnique({
    where: { seasonId_driverId: { seasonId: sid, driverId } },
    include: { driver: true },
  });
  return entry;
}

export async function getDriverEntriesForConstructor(seriesId, constructorId) {
  const prisma = requirePrisma();
  const sid = seasonId(seriesId);
  return prisma.driverSeasonEntry.findMany({
    where: { seasonId: sid, constructorId },
    include: { driver: true },
    orderBy: { gridOrder: 'asc' },
  });
}

export async function getDriverGridFromDb(seriesId) {
  const prisma = requirePrisma();
  const sid = seasonId(seriesId);
  const entries = await prisma.driverSeasonEntry.findMany({
    where: { seasonId: sid },
    orderBy: { gridOrder: 'asc' },
  });
  if (!entries.length) return null;
  return entries.map((e) => ({
    driverId: e.driverId,
    driver: e.displayName,
    team: e.teamName,
    gridOrder: e.gridOrder ?? 99,
    givenName: e.driver.givenName,
    familyName: e.driver.familyName,
    nationality: e.driver.nationality,
    headshotUrl: resolveFormulaMediaUrl(
      seriesId,
      e.driverId,
      'headshot',
      e.headshotUrl ?? e.driver?.headshotUrl,
    ),
  }));
}

export async function getConstructorGridFromDb(seriesId) {
  const prisma = requirePrisma();
  const sid = seasonId(seriesId);
  const rows = await prisma.constructorSeason.findMany({
    where: { seasonId: sid },
    include: { constructor: true },
  });
  if (!rows.length) return null;
  return rows.map((c) => ({
    constructorId: c.constructorId,
    team: c.name,
    logoUrl: resolveFormulaMediaUrl(seriesId, c.constructorId, 'logo', c.logoUrl),
    bikeImageUrl: resolveFormulaMediaUrl(seriesId, c.constructorId, 'car', c.bikeImageUrl),
  }));
}

export async function getRaceResultsFromDb(seriesId, round, sessionKey = 'race') {
  const prisma = requirePrisma();
  const event = await prisma.event.findUnique({
    where: { seasonId_round: { seasonId: seasonId(seriesId), round } },
    include: { sessionResults: { where: { sessionKey }, take: 1 } },
  });
  if (!event?.sessionResults[0]) return null;
  const payload = event.sessionResults[0].payload;
  if (!payload || typeof payload !== 'object') return null;
  return payload;
}

export async function getRoundSessionsFromDb(seriesId, round) {
  return getRaceResultsFromDb(seriesId, round, '_sessions');
}
