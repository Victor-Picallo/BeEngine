import { defaultSessionFor, slugifyRace, type SessionKey } from '../race/race-slug';
import { sessionsForRaceWeekend } from './f1-weekend-sessions';
import type { JolpikaCalendarRace, OpenF1Session } from './f1-live.types';

/** OpenF1 session_name → ruta BeEngine (`/f1/calendario/:gp/:session`). */
export const OPENF1_SESSION_TO_KEY: Record<string, SessionKey> = {
  'Practice 1': 'fp1',
  'Practice 2': 'fp2',
  'Practice 3': 'fp3',
  Qualifying: 'qualy',
  'Sprint Shootout': 'qualy-sprint',
  'Sprint Qualifying': 'qualy-sprint',
  Sprint: 'sprint',
  Race: 'race',
};

export const SESSION_KEY_TO_OPENF1_NAMES: Record<SessionKey, string[]> = {
  fp1: ['Practice 1'],
  fp2: ['Practice 2'],
  fp3: ['Practice 3'],
  qualy: ['Qualifying'],
  'qualy-sprint': ['Sprint Shootout', 'Sprint Qualifying'],
  sprint: ['Sprint'],
  race: ['Race'],
};

export function openF1SessionKeyFromName(sessionName: string): SessionKey {
  return OPENF1_SESSION_TO_KEY[sessionName] ?? 'race';
}

const LIVE_GRACE_MS = 30 * 60_000;

export function isOpenF1SessionLive(session: OpenF1Session, nowMs = Date.now()): boolean {
  const start = Date.parse(session.dateStart);
  const end = Date.parse(session.dateEnd);

  if (!Number.isFinite(start)) return false;
  if (!Number.isFinite(end)) return nowMs >= start;

  return nowMs >= start && nowMs <= end + LIVE_GRACE_MS;
}

/** Sesión en curso de un GP concreto (para enlaces desde el calendario). */
export function liveSessionKeyForRace(
  race: JolpikaCalendarRace,
  sessions: OpenF1Session[],
  nowMs = Date.now(),
): SessionKey | null {
  const weekend = sessionsForRaceWeekend(sessions, race);
  const live = weekend.find((s) => isOpenF1SessionLive(s, nowMs));
  return live ? openF1SessionKeyFromName(live.sessionName) : null;
}

/** Tab del calendario: sesión live si hay una, si no la habitual (fp1 / race). */
export function defaultSessionLinkForRace(
  race: JolpikaCalendarRace,
  sessions: OpenF1Session[],
  nowMs = Date.now(),
): SessionKey {
  return liveSessionKeyForRace(race, sessions, nowMs) ?? defaultSessionFor(race);
}

export function isRaceWeekendLive(
  race: JolpikaCalendarRace,
  sessions: OpenF1Session[],
  nowMs = Date.now(),
): boolean {
  return liveSessionKeyForRace(race, sessions, nowMs) !== null;
}

const MAIN_RACE_SESSION_NAMES = ['Race', 'Sprint'] as const;

function isCalendarDatePast(race: JolpikaCalendarRace, nowMs: number): boolean {
  const raceTime = race.time ?? '23:59:59Z';
  const t = Date.parse(`${race.date}T${raceTime}`);
  return Number.isFinite(t) && t < nowMs;
}

/** Sesión Race/Sprint del fin de semana (marca cuándo termina el GP). */
export function mainRaceSessionForWeekend(weekend: OpenF1Session[]): OpenF1Session | null {
  for (const name of MAIN_RACE_SESSION_NAMES) {
    const match = weekend.find((s) => s.sessionName === name);
    if (match) return match;
  }
  return null;
}

/** GP destacado: desde la 1ª sesión OpenF1 hasta que acaba Race/Sprint. */
export function isRaceWeekendFeatured(
  race: JolpikaCalendarRace,
  sessions: OpenF1Session[],
  nowMs = Date.now(),
): boolean {
  const weekend = sessionsForRaceWeekend(sessions, race);
  if (!weekend.length) return false;
  if (isRaceWeekendLive(race, sessions, nowMs)) return true;

  const main = mainRaceSessionForWeekend(weekend);
  if (!main) return false;

  const starts = weekend
    .map((s) => Date.parse(s.dateStart))
    .filter((t) => Number.isFinite(t));
  const firstStart = starts.length ? Math.min(...starts) : NaN;
  const raceEnd = Date.parse(main.dateEnd);

  return (
    Number.isFinite(firstStart) &&
    Number.isFinite(raceEnd) &&
    nowMs >= firstStart &&
    nowMs <= raceEnd
  );
}

/** El GP ya terminó (Race/Sprint finalizada según OpenF1). */
export function isRaceWeekendComplete(
  race: JolpikaCalendarRace,
  sessions: OpenF1Session[],
  nowMs = Date.now(),
): boolean {
  if (isRaceWeekendFeatured(race, sessions, nowMs)) return false;

  const weekend = sessionsForRaceWeekend(sessions, race);
  const main = mainRaceSessionForWeekend(weekend);
  if (main) {
    const raceEnd = Date.parse(main.dateEnd);
    return Number.isFinite(raceEnd) && nowMs > raceEnd;
  }

  if (race.resultsAvailable === true) return true;
  return isCalendarDatePast(race, nowMs);
}

export function findFeaturedF1Race(
  calendar: JolpikaCalendarRace[],
  sessions: OpenF1Session[],
  nowMs = Date.now(),
): JolpikaCalendarRace | null {
  if (!calendar.length) return null;

  if (sessions.length) {
    const featured = calendar.find((r) => isRaceWeekendFeatured(r, sessions, nowMs));
    if (featured) return featured;
    const open = calendar.find((r) => !isRaceWeekendComplete(r, sessions, nowMs));
    if (open) return open;
    return calendar[calendar.length - 1] ?? null;
  }

  const today = new Date(nowMs).toISOString().slice(0, 10);
  return calendar.find((r) => r.date >= today) ?? calendar[calendar.length - 1] ?? null;
}

/** Ruta Angular hacia la sesión en directo (o la más relevante del fin de semana). */
export function resolveF1LiveRoute(
  calendar: JolpikaCalendarRace[],
  sessions: OpenF1Session[],
  nowMs = Date.now(),
): (string | number)[] | null {
  if (!calendar.length) return null;

  const liveOpen = sessions.find((s) => isOpenF1SessionLive(s, nowMs));
  if (liveOpen) {
    for (const race of calendar) {
      const weekend = sessionsForRaceWeekend(sessions, race);
      if (weekend.some((w) => w.sessionKey === liveOpen.sessionKey)) {
        return ['/f1/calendario', slugifyRace(race), openF1SessionKeyFromName(liveOpen.sessionName)];
      }
    }
  }

  const today = new Date(nowMs).toISOString().slice(0, 10);
  const race =
    calendar.find((r) => r.date >= today) ?? calendar[calendar.length - 1] ?? null;
  if (!race) return null;

  const weekend = sessionsForRaceWeekend(sessions, race);
  const liveInWeekend = weekend.find((s) => isOpenF1SessionLive(s, nowMs));
  if (liveInWeekend) {
    return [
      '/f1/calendario',
      slugifyRace(race),
      openF1SessionKeyFromName(liveInWeekend.sessionName),
    ];
  }

  return ['/f1/calendario', slugifyRace(race), defaultSessionFor(race)];
}
