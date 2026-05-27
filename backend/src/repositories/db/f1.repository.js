import { requirePrisma } from '../../lib/prisma.js';
import { seasonIdFor } from './season.repository.js';
import {
  eventToCalendarRow,
  mergeDriverStandingsWithGrid,
  sessionPayloadToLastRace,
} from './mappers/f1.mappers.js';
import { toPublicMediaUrl } from '../../lib/supabaseStorage.js';

const F1_SEASON = () => seasonIdFor('f1');

export async function getCalendarFromDb() {
  const prisma = requirePrisma();
  const rows = await prisma.event.findMany({
    where: { seasonId: F1_SEASON() },
    orderBy: { round: 'asc' },
  });
  if (!rows.length) return null;
  return rows.map(eventToCalendarRow);
}

export async function getDriverStandingsFromDb() {
  const prisma = requirePrisma();
  const seasonId = F1_SEASON();
  const [standings, grid] = await Promise.all([
    prisma.driverStanding.findMany({
      where: { seasonId },
      include: { driver: true },
      orderBy: { position: 'asc' },
    }),
    prisma.driverSeasonEntry.findMany({
      where: { seasonId },
      orderBy: { gridOrder: 'asc' },
    }),
  ]);
  if (!grid.length && !standings.length) return null;

  const standingRows = standings.map((row) => {
    const entry = grid.find((g) => g.driverId === row.driverId);
    const d = row.driver;
    const name =
      d.givenName && d.familyName
        ? `${d.givenName} ${d.familyName}`.trim()
        : entry?.displayName ?? row.driverId;
    return {
      pos: row.position,
      driver: name,
      driverId: row.driverId,
      team: entry?.teamName ?? '',
      points: row.points,
      wins: row.wins,
      nationality: d.nationality ?? '',
      headshotUrl: toPublicMediaUrl(entry?.headshotUrl ?? d.headshotUrl),
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

export async function getConstructorStandingsFromDb() {
  const prisma = requirePrisma();
  const seasonId = F1_SEASON();
  const rows = await prisma.constructorStanding.findMany({
    where: { seasonId },
    include: {
      constructor: {
        include: {
          seasons: { where: { seasonId }, take: 1 },
        },
      },
    },
    orderBy: { position: 'asc' },
  });
  if (!rows.length) return null;
  return rows.map((row) => {
    const cs = row.constructor.seasons[0];
    const cid = row.constructorId;
    return {
      pos: row.position,
      team: cs?.name ?? cid,
      constructorId: cid,
      points: row.points,
      wins: row.wins,
      nationality: '',
      teamColor: cs?.teamColor ?? null,
      logoUrl: toPublicMediaUrl(cs?.logoUrl),
      bikeImageUrl: toPublicMediaUrl(cs?.bikeImageUrl),
    };
  });
}

export async function getConstructorBikeImageUrl(constructorId) {
  const prisma = requirePrisma();
  const cs = await prisma.constructorSeason.findUnique({
    where: {
      seasonId_constructorId: {
        seasonId: F1_SEASON(),
        constructorId: String(constructorId || '').trim().toLowerCase(),
      },
    },
  });
  return toPublicMediaUrl(cs?.bikeImageUrl) ?? null;
}

export async function getLastRaceFromDb() {
  const prisma = requirePrisma();
  const seasonId = F1_SEASON();
  const lastEvent = await prisma.event.findFirst({
    where: { seasonId, resultsAvailable: true },
    orderBy: { round: 'desc' },
    include: {
      sessionResults: { where: { sessionKey: 'race' }, take: 1 },
    },
  });
  if (!lastEvent?.sessionResults[0]) return null;
  const payload = sessionPayloadToLastRace(lastEvent.sessionResults[0].payload);
  if (!payload) return null;
  return { ...payload, round: lastEvent.round, imageUrl: null };
}

export async function getRaceResultsFromDb(round) {
  const prisma = requirePrisma();
  const seasonId = F1_SEASON();
  const event = await prisma.event.findUnique({
    where: { seasonId_round: { seasonId, round } },
    include: { sessionResults: { where: { sessionKey: 'race' }, take: 1 } },
  });
  if (!event?.sessionResults[0]) return null;
  const payload = event.sessionResults[0].payload;
  if (!payload || typeof payload !== 'object') return null;
  return payload;
}
