import type { JolpikaCalendarRace } from '../f1-live/f1-live.types';

export type SessionKey = 'fp1' | 'fp2' | 'fp3' | 'qualy' | 'qualy-sprint' | 'sprint' | 'race';

export interface SessionConfig {
  key: SessionKey;
  label: string;
  longLabel: string;
  durationMinutes: number;
}

export const SESSION_CONFIGS: Record<SessionKey, SessionConfig> = {
  fp1:            { key: 'fp1',           label: 'FP1',    longLabel: 'Free Practice 1',  durationMinutes: 60 },
  fp2:            { key: 'fp2',           label: 'FP2',    longLabel: 'Free Practice 2',  durationMinutes: 60 },
  fp3:            { key: 'fp3',           label: 'FP3',    longLabel: 'Free Practice 3',  durationMinutes: 60 },
  qualy:          { key: 'qualy',         label: 'QUALY',  longLabel: 'Qualifying',       durationMinutes: 60 },
  'qualy-sprint': { key: 'qualy-sprint',  label: 'SPRINT QUALY', longLabel: 'Sprint Shootout', durationMinutes: 30 },
  sprint:         { key: 'sprint',        label: 'SPRINT', longLabel: 'Sprint',           durationMinutes: 35 },
  race:           { key: 'race',          label: 'RACE',   longLabel: 'Race',             durationMinutes: 120 },
};

export const SESSION_ORDER: SessionKey[] = ['fp1', 'fp2', 'fp3', 'qualy', 'qualy-sprint', 'sprint', 'race'];

export function slugifyRace(race: Pick<JolpikaCalendarRace, 'raceName'>): string {
  return race.raceName
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function findRaceBySlug(
  races: JolpikaCalendarRace[],
  slug: string,
): JolpikaCalendarRace | null {
  if (!slug) return null;
  return races.find(r => slugifyRace(r) === slug) ?? null;
}

export function isValidSession(value: string | null): value is SessionKey {
  return !!value && (value in SESSION_CONFIGS);
}

export function defaultSessionFor(race: JolpikaCalendarRace | null): SessionKey {
  if (!race) return 'fp1';
  const raceTime = race.time ?? '23:59:59Z';
  const raceDate = new Date(`${race.date}T${raceTime}`);
  return Number.isFinite(raceDate.getTime()) && raceDate < new Date() ? 'race' : 'fp1';
}
