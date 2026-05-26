/**
 * Helpers compartidos para scripts sync → Prisma.
 */
import { seasonIdFor, currentSeasonYear } from '../../src/repositories/db/season.repository.js';

export const SERIES_META = {
  f1: { label: 'Formula 1', short: 'F1', accent: '#FFD100' },
  f2: { label: 'Formula 2', short: 'F2', accent: '#0090FF' },
  f3: { label: 'Formula 3', short: 'F3', accent: '#9E9E9E' },
  motogp: { label: 'MotoGP', short: 'MotoGP', accent: '#0052CC' },
  moto2: { label: 'Moto 2', short: 'Moto2', accent: '#FF6B35' },
  moto3: { label: 'Moto 3', short: 'Moto3', accent: '#52C41A' },
};

export function seasonId(seriesId) {
  return seasonIdFor(seriesId, currentSeasonYear());
}

export async function ensureSeries(prisma, seriesId) {
  const meta = SERIES_META[seriesId];
  if (!meta) throw new Error(`Unknown series ${seriesId}`);
  const sid = seasonId(seriesId);
  await prisma.series.upsert({
    where: { id: seriesId },
    create: { id: seriesId, ...meta },
    update: { label: meta.label, short: meta.short, accent: meta.accent },
  });
  await prisma.season.upsert({
    where: { id: sid },
    create: { id: sid, seriesId, year: currentSeasonYear() },
    update: {},
  });
  return sid;
}

export async function startSyncRun(prisma, seriesId, source) {
  return prisma.syncRun.create({
    data: { seriesId, source, status: 'running' },
  });
}

export async function finishSyncRun(prisma, id, status, meta, error = null) {
  await prisma.syncRun.update({
    where: { id },
    data: { status, finishedAt: new Date(), meta, error },
  });
}

export async function upsertConstructor(prisma, seasonId, constructorId, name, extras = {}) {
  await prisma.constructor.upsert({
    where: { id: constructorId },
    create: { id: constructorId, externalId: extras.externalId ?? null },
    update: { externalId: extras.externalId ?? undefined },
  });
  await prisma.constructorSeason.upsert({
    where: { seasonId_constructorId: { seasonId, constructorId } },
    create: {
      seasonId,
      constructorId,
      name,
      teamColor: extras.teamColor ?? null,
      logoUrl: extras.logoUrl ?? null,
      bikeImageUrl: extras.bikeImageUrl ?? null,
    },
    update: {
      name,
      teamColor: extras.teamColor ?? undefined,
      logoUrl: extras.logoUrl ?? undefined,
      bikeImageUrl: extras.bikeImageUrl ?? undefined,
    },
  });
}

export async function upsertDriverEntry(
  prisma,
  seasonId,
  { driverId, givenName, familyName, nationality, displayName, teamName, constructorId, gridOrder, headshotUrl },
) {
  await prisma.driver.upsert({
    where: { id: driverId },
    create: {
      id: driverId,
      givenName: givenName ?? null,
      familyName: familyName ?? null,
      nationality: nationality?.slice(0, 8) ?? null,
      headshotUrl: headshotUrl ?? null,
    },
    update: {
      givenName: givenName ?? undefined,
      familyName: familyName ?? undefined,
      nationality: nationality?.slice(0, 8) ?? undefined,
      headshotUrl: headshotUrl ?? undefined,
    },
  });
  await prisma.driverSeasonEntry.upsert({
    where: { seasonId_driverId: { seasonId, driverId } },
    create: {
      seasonId,
      driverId,
      constructorId,
      displayName,
      teamName,
      gridOrder: gridOrder ?? null,
      headshotUrl: headshotUrl ?? null,
    },
    update: {
      constructorId,
      displayName,
      teamName,
      gridOrder: gridOrder ?? undefined,
      headshotUrl: headshotUrl ?? undefined,
    },
  });
}

export async function upsertDriverStanding(prisma, seasonId, row) {
  await prisma.driverStanding.upsert({
    where: { seasonId_driverId: { seasonId, driverId: row.driverId } },
    create: {
      seasonId,
      driverId: row.driverId,
      position: row.pos,
      points: row.points,
      wins: row.wins ?? 0,
      podiums: row.podiums ?? 0,
      poles: row.poles ?? 0,
    },
    update: {
      position: row.pos,
      points: row.points,
      wins: row.wins ?? 0,
    },
  });
}

export async function upsertConstructorStanding(prisma, seasonId, row) {
  await prisma.constructorStanding.upsert({
    where: {
      seasonId_constructorId: { seasonId, constructorId: row.constructorId },
    },
    create: {
      seasonId,
      constructorId: row.constructorId,
      position: row.pos,
      points: row.points,
      wins: row.wins ?? 0,
    },
    update: {
      position: row.pos,
      points: row.points,
      wins: row.wins ?? 0,
    },
  });
}

export async function upsertCalendarEvent(prisma, seasonId, r) {
  return prisma.event.upsert({
    where: { seasonId_round: { seasonId, round: r.round } },
    create: {
      seasonId,
      round: r.round,
      raceName: r.raceName,
      circuitName: r.circuitName ?? '',
      locality: r.locality ?? '',
      country: r.country ?? '',
      date: r.date ?? null,
      time: r.time ?? null,
      status: r.resultsAvailable ? 'FINISHED' : 'SCHEDULED',
      externalEventId:
        r.eventId != null
          ? String(r.eventId)
          : r.externalEventId != null
            ? String(r.externalEventId)
            : null,
      circuitId: r.circuitId ?? null,
      circuitSvgUrl: r.circuitSvgUrl ?? null,
      circuitImageUrl: r.circuitImageUrl ?? null,
      resultsAvailable: Boolean(r.resultsAvailable),
    },
    update: {
      raceName: r.raceName,
      circuitName: r.circuitName ?? undefined,
      locality: r.locality ?? undefined,
      country: r.country ?? undefined,
      date: r.date ?? undefined,
      time: r.time ?? undefined,
      resultsAvailable: Boolean(r.resultsAvailable),
      externalEventId:
        r.eventId != null
          ? String(r.eventId)
          : r.externalEventId != null
            ? String(r.externalEventId)
            : undefined,
      circuitId: r.circuitId ?? undefined,
      circuitSvgUrl: r.circuitSvgUrl ?? undefined,
      circuitImageUrl: r.circuitImageUrl ?? undefined,
    },
  });
}

export async function upsertRaceSession(prisma, seasonId, round, sessionKey, payload) {
  let event = await prisma.event.findUnique({
    where: { seasonId_round: { seasonId, round } },
  });
  if (!event) {
    event = await prisma.event.create({
      data: {
        seasonId,
        round,
        raceName: payload.raceName ?? `Round ${round}`,
        circuitName: payload.circuitName ?? '',
        date: payload.date ?? null,
        resultsAvailable: true,
      },
    });
  } else {
    await prisma.event.update({
      where: { id: event.id },
      data: { resultsAvailable: true },
    });
  }
  await prisma.sessionResult.upsert({
    where: { eventId_sessionKey: { eventId: event.id, sessionKey } },
    create: { eventId: event.id, sessionKey, payload },
    update: { payload },
  });
  return event;
}
