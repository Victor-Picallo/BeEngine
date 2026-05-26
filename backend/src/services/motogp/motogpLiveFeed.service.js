import { fetchLiveTimingLite } from './motogpLiveTiming.service.js';
import { getSessionWeather } from './motogpWeather.service.js';
import { getSessionSectors, normalizeRiderShortName } from './motogpSectors.service.js';
import { buildRaceMessages } from './motogpRaceMessages.service.js';
import { fetchSessionDetail, resolveSessionContext } from './motogpSessionContext.service.js';
import { applySectorColors } from './motogpSectorColors.service.js';
import { getCalendar, getRaceResultsByRound } from './pulseLive.service.js';

/**
 * Paquete live (timing + clima + sectores + mensajes + resultados provisionales).
 */
export const getMotogpLiveFeed = async (
  round,
  sessionKey = 'race',
  categoryId = 'motogp',
) => {
  const timing = await fetchLiveTimingLite(categoryId);

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

  const [weatherPack, sectorsPack, ctx, sessionResults] = await Promise.all([
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
  ]);

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
  }

  const ridersRaw = (timing.riders ?? []).map((rider) => {
    const key = normalizeRiderShortName(rider.shortName);
    const sec = sectorMap.get(key);
    const bikeName = rider.bikeName ?? rider.bike_name ?? '—';
    return {
      ...rider,
      s1: sec?.s1 ?? '—',
      s2: sec?.s2 ?? '—',
      s3: sec?.s3 ?? '—',
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
      ctx?.event?.circuit?.name ||
      null,
  };
};
