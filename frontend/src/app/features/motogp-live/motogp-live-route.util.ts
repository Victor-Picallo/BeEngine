import type { JolpikaCalendarRace } from '../f1-live/f1-live.types';
import {
  defaultMotogpSession,
  isMotogpSessionKey,
  type MotogpSessionKey,
} from '../race/motogp-session';
import { slugifyRace } from '../race/race-slug';
import { pulseLiveSessionKeyFromShort } from './motogp-live-session-key';
import type { MotogpLiveTimingHead, MotogpLiveTimingPayload } from './motogp-live.types';

const norm = (s: string): string =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

const WEEKEND_WINDOW_DAYS = 4;

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isCalendarDatePast(race: JolpikaCalendarRace, nowMs: number): boolean {
  const raceTime = race.time ?? '23:59:59Z';
  const t = Date.parse(`${race.date}T${raceTime}`);
  return Number.isFinite(t) && t < nowMs;
}

/** Empareja circuito Pulse ↔ ronda del calendario BeEngine. */
export function findRaceForPulseLive(
  calendar: JolpikaCalendarRace[],
  head: MotogpLiveTimingHead | null | undefined,
): JolpikaCalendarRace | null {
  if (!head?.circuitName || !calendar.length) return null;
  const cn = norm(head.circuitName);
  if (!cn) return null;

  const exact = calendar.find((r) => norm(r.circuitName) === cn);
  if (exact) return exact;

  return (
    calendar.find((r) => {
      const rc = norm(r.circuitName);
      const loc = norm(r.locality || '');
      return (
        (rc && (rc.includes(cn) || cn.includes(rc))) ||
        (loc && (cn.includes(loc) || loc.includes(cn)))
      );
    }) ?? null
  );
}

export function liveSessionKeyFromTiming(
  live: MotogpLiveTimingPayload | null | undefined,
): MotogpSessionKey | null {
  if (!live?.active || !live.head) return null;
  const key = pulseLiveSessionKeyFromShort(live.head.sessionShortName);
  return isMotogpSessionKey(key) ? key : 'race';
}

export function isMotogpRaceLive(
  race: JolpikaCalendarRace,
  live: MotogpLiveTimingPayload | null | undefined,
): boolean {
  if (!live?.active || !live.head) return false;
  return findRaceForPulseLive([race], live.head) !== null;
}

/**
 * GP MotoGP destacado: Pulse en directo o ventana del evento (date_start suele ser viernes).
 * Se mantiene hasta pasar la ventana del fin de semana o tener resultados.
 */
export function isMotogpWeekendFeatured(
  race: JolpikaCalendarRace,
  calendar: JolpikaCalendarRace[],
  live: MotogpLiveTimingPayload | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (isMotogpRaceLive(race, live)) return true;

  const today = new Date(nowMs).toISOString().slice(0, 10);
  if (!race.date || race.date > today) return false;

  const idx = calendar.findIndex((r) => r.round === race.round);
  const next = idx >= 0 ? calendar[idx + 1] : null;
  if (next?.date && next.date <= today) return false;

  const windowEnd = addDaysIso(race.date, WEEKEND_WINDOW_DAYS);
  return today <= windowEnd;
}

export function isMotogpWeekendComplete(
  race: JolpikaCalendarRace,
  calendar: JolpikaCalendarRace[],
  live: MotogpLiveTimingPayload | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (isMotogpWeekendFeatured(race, calendar, live, nowMs)) return false;
  if (race.resultsAvailable === true) return true;
  return isCalendarDatePast(race, nowMs);
}

export function findFeaturedMotogpRace(
  calendar: JolpikaCalendarRace[],
  live: MotogpLiveTimingPayload | null | undefined,
  nowMs = Date.now(),
): JolpikaCalendarRace | null {
  if (!calendar.length) return null;

  if (live?.active && live.head) {
    const pulseRace = findRaceForPulseLive(calendar, live.head);
    if (pulseRace) return pulseRace;
  }

  const featured = calendar.find((r) =>
    isMotogpWeekendFeatured(r, calendar, live, nowMs),
  );
  if (featured) return featured;

  const open = calendar.find((r) => !isMotogpWeekendComplete(r, calendar, live, nowMs));
  if (open) return open;

  return calendar[calendar.length - 1] ?? null;
}

/** Sesión del enlace calendario: live si Pulse lo indica, si no fp1/race por fecha. */
export function defaultSessionLinkForMotogpRace(
  race: JolpikaCalendarRace,
  live: MotogpLiveTimingPayload | null | undefined,
): MotogpSessionKey {
  if (isMotogpRaceLive(race, live)) {
    return liveSessionKeyFromTiming(live) ?? defaultMotogpSession(race);
  }
  return defaultMotogpSession(race);
}

export function resolveMotogpLiveRoute(
  calendar: JolpikaCalendarRace[],
  live: MotogpLiveTimingPayload | null | undefined,
  homePath = '/motogp',
): (string | number)[] | null {
  if (!calendar.length) return null;

  if (live?.active && live.head) {
    const race = findRaceForPulseLive(calendar, live.head);
    if (race) {
      const session = liveSessionKeyFromTiming(live) ?? 'race';
      return [homePath, 'calendario', slugifyRace(race), session];
    }
  }

  const race = findFeaturedMotogpRace(calendar, live);
  if (!race) return null;

  return [
    homePath,
    'calendario',
    slugifyRace(race),
    defaultSessionLinkForMotogpRace(race, live),
  ];
}
