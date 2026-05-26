import {
  getCalendarFromDb as feederCalendar,
  getConstructorStandingsFromDb as feederConstructors,
  getDriverStandingsFromDb as feederDrivers,
  getLastRaceFromDb as feederLastRace,
  getRaceResultsFromDb as feederRace,
} from './feeder.repository.js';
import { requirePrisma } from '../../lib/prisma.js';
import { seasonIdFor } from './season.repository.js';

const sid = (categoryId) => seasonIdFor(categoryId);

export const getCalendarFromDb = (categoryId) => feederCalendar(categoryId);

export const getDriverStandingsFromDb = (categoryId) => feederDrivers(categoryId);

export const getConstructorStandingsFromDb = (categoryId) =>
  feederConstructors(categoryId);

export const getLastRaceFromDb = (categoryId) => feederLastRace(categoryId);

export const getRaceResultsFromDb = (categoryId, round, sessionKey = 'race') =>
  feederRace(categoryId, round, sessionKey);

export { getRoundSessionsFromDb } from './feeder.repository.js';

/** Parrilla oficial Moto (constructors + stats en DB). */
export async function getOfficialTeamsGridFromDb(categoryId) {
  const prisma = requirePrisma();
  const seasonId = sid(categoryId);
  const rows = await prisma.constructorStanding.findMany({
    where: { seasonId },
    include: {
      constructor: {
        include: { seasons: { where: { seasonId }, take: 1 } },
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
      teamId: row.constructor.externalId ?? row.constructorId,
      points: row.points,
      wins: row.wins,
      nationality: '',
      teamColor: cs?.teamColor ?? null,
      logoUrl: cs?.logoUrl ?? null,
      bikeImageUrl: cs?.bikeImageUrl ?? null,
    };
  });
}
