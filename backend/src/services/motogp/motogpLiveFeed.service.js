import { fetchLiveTimingLite } from './motogpLiveTiming.service.js';
import { getSessionWeather } from './motogpWeather.service.js';
import { getSessionSectors, normalizeRiderShortName } from './motogpSectors.service.js';
import { buildRaceMessages } from './motogpRaceMessages.service.js';
import { fetchSessionDetail, resolveSessionContext } from './motogpSessionContext.service.js';
import { applySectorColors } from './motogpSectorColors.service.js';
import { pickCircuitMapUrl } from './motogpCircuitMedia.js';
import { getCalendar, getRaceResultsByRound } from './pulseLive.service.js';

const riderShortFromFull = (name) => {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return String(name ?? '').slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1]).toUpperCase();
};

const sectorLookupKeys = (name) => {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const keys = new Set([normalizeRiderShortName(riderShortFromFull(name))]);
  if (parts.length >= 2) {
    keys.add(normalizeRiderShortName(`${parts[0][0]}.${parts[parts.length - 1]}`));
    keys.add(normalizeRiderShortName(`${parts[0][0]} ${parts[parts.length - 1]}`));
  }
  return keys;
};

const findSectorRow = (sectorMap, driverName) => {
  const full = String(driverName ?? '').toLowerCase();
  if (full) {
    for (const row of sectorMap.values()) {
      if (row.fullName && String(row.fullName).toLowerCase() === full) return row;
    }
  }
  for (const key of sectorLookupKeys(driverName)) {
    const hit = sectorMap.get(key);
    if (hit) return hit;
  }
  return null;
};

/** Cuando livetiming está vacío pero hay PDF de sectores + clasificación oficial. */
const buildPostRaceTimingRiders = (sessionResults, sectorMap) => {
  const rows = sessionResults?.results ?? [];
  if (!rows.length || !sectorMap.size) return [];

  return rows.map((row) => {
    const shortName = riderShortFromFull(row.driver);
    const sec = findSectorRow(sectorMap, row.driver);
    return {
      position: row.position,
      riderNumber: row.number ?? row.position,
      riderId: row.driverId ?? '',
      driver: row.driver,
      shortName,
      team: row.team,
      teamColor: row.teamColor ?? '#888888',
      gap: row.gap ?? (row.position === 1 ? '—' : row.time ?? '—'),
      interval: row.interval ?? '—',
      lastLap: '—',
      bestLap: sec?.bestLap ?? row.bestLap ?? '—',
      frontTyre: sec?.frontTyre ?? null,
      rearTyre: sec?.rearTyre ?? null,
      laps: row.laps ?? 0,
      onPit: false,
      s1: sec?.s1 ?? '—',
      s2: sec?.s2 ?? '—',
      s3: sec?.s3 ?? '—',
    };
  });
};

/**
 * Paquete live (timing + clima + sectores + mensajes + resultados provisionales).
 */
export const getMotogpLiveFeed = async (
  round,
  sessionKey = 'race',
  categoryId = 'motogp',
) => {
  let timing;
  try {
    timing = await fetchLiveTimingLite(categoryId);
  } catch {
    timing = { active: false, categoryId, head: null, riders: [] };
  }

  let resolvedRound = Number.parseInt(round, 10);
  let resolvedKey = String(sessionKey || 'race').toLowerCase();

  if (!Number.isInteger(resolvedRound) || resolvedRound < 1) {
    const calPack = await getCalendar();
    const items = calPack?.items ?? [];
    if (timing.active && timing.head?.circuitName) {
      const cn = timing.head.circuitName.toLowerCase();
      const match = items.find(
        (r) =>
          r.circuitName?.toLowerCase().includes(cn) ||
          cn.includes(r.circuitName?.toLowerCase() ?? ''),
      );
      if (match) resolvedRound = match.round;
    }
    if (!resolvedRound) {
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = items.find((r) => r.date >= today);
      resolvedRound = upcoming?.round ?? items.length ?? 1;
    }
    if (timing.head?.sessionShortName) {
      const s = String(timing.head.sessionShortName).toUpperCase();
      if (s.includes('FP2')) resolvedKey = 'fp2';
      else if (s.includes('FP1') || s === 'FP') resolvedKey = 'fp1';
      else if (s.startsWith('Q2')) resolvedKey = 'q2';
      else if (s.startsWith('Q')) resolvedKey = 'q1';
      else if (s.includes('SPR')) resolvedKey = 'sprint';
      else if (s.includes('WUP')) resolvedKey = 'warmup';
      else if (s.includes('RAC')) resolvedKey = 'race';
    }
  }

  const sectorTtl = timing.active ? 12_000 : 45_000;

  const [weatherPack, sectorsPack, ctx, sessionResults, calPack] = await Promise.all([
    getSessionWeather(resolvedRound, resolvedKey, categoryId).catch(() => ({
      source: 'none',
      weather: null,
    })),
    getSessionSectors(resolvedRound, resolvedKey, categoryId, { cacheMs: sectorTtl }).catch(() => ({
      source: 'none',
      riders: [],
    })),
    resolveSessionContext(resolvedRound, resolvedKey, categoryId),
    getRaceResultsByRound(resolvedRound, resolvedKey, categoryId).catch(() => null),
    getCalendar(categoryId).catch(() => ({ items: [] })),
  ]);

  const calRow = (calPack?.items ?? []).find((r) => r.round === resolvedRound) ?? null;

  let condition = null;
  if (ctx?.session?.id) {
    try {
      const detail = await fetchSessionDetail(ctx.session.id);
      condition = detail?.condition ?? null;
    } catch {
      condition = null;
    }
  }

  const sectorMap = new Map();
  for (const r of sectorsPack.riders ?? []) {
    sectorMap.set(normalizeRiderShortName(r.riderShortName), r);
    if (r.fullName) sectorMap.set(String(r.fullName).toLowerCase(), r);
  }

  let timingRiders = timing.riders ?? [];
  if (!timingRiders.length && sessionResults?.results?.length) {
    timingRiders = buildPostRaceTimingRiders(sessionResults, sectorMap);
  }

  const ridersRaw = timingRiders.map((rider) => {
    const sec = findSectorRow(
      sectorMap,
      rider.driver ?? rider.shortName ?? '',
    ) ?? (rider.shortName ? sectorMap.get(normalizeRiderShortName(rider.shortName)) : null);
    const bikeName = rider.bikeName ?? rider.bike_name ?? '—';
    return {
      ...rider,
      bestLap: rider.bestLap ?? sec?.bestLap ?? '—',
      frontTyre: rider.frontTyre ?? sec?.frontTyre ?? null,
      rearTyre: rider.rearTyre ?? sec?.rearTyre ?? null,
      s1: sec?.s1 ?? rider.s1 ?? '—',
      s2: sec?.s2 ?? rider.s2 ?? '—',
      s3: sec?.s3 ?? rider.s3 ?? '—',
      bikeName,
      bike: bikeName,
    };
  });

  const ridersColored = applySectorColors(ridersRaw).map((r) => ({
    ...r,
    s1c: r.s1c,
    s2c: r.s2c,
    s3c: r.s3c,
  }));

  const messages = buildRaceMessages({
    head: timing.head
      ? {
          session_status_id: timing.head.sessionStatusId,
          session_status_name: timing.head.sessionStatus,
          remaining: timing.head.remaining,
        }
      : null,
    session: ctx?.session ?? null,
    condition,
    riders: ridersColored,
  });

  return {
    source: `pulselive-${categoryId}`,
    categoryId,
    round: resolvedRound,
    sessionKey: resolvedKey,
    timing: {
      ...timing,
      riders: ridersColored,
    },
    sessionResults,
    weather: weatherPack.weather,
    weatherSource: weatherPack.source,
    sectorsSource: sectorsPack.source,
    messages,
    eventName: timing.head?.eventName ?? ctx?.event?.sponsored_name ?? ctx?.event?.name ?? null,
    circuitName:
      String(timing.head?.circuitName ?? '').trim() ||
      sessionResults?.circuitName ||
      ctx?.event?.circuit?.name ||
      null,
    circuitSvgUrl:
      sessionResults?.circuitSvgUrl ??
      calRow?.circuitSvgUrl ??
      pickCircuitMapUrl(ctx?.event?.circuit) ??
      null,
    circuitImageUrl:
      sessionResults?.circuitImageUrl ??
      calRow?.circuitImageUrl ??
      calRow?.circuitSvgUrl ??
      ctx?.event?.circuit?.imageUrl ??
      null,
  };
};
