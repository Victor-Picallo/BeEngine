import type { JolpikaCalendarRace } from '../f1-live/f1-live.types';

export type MotogpSessionKey =
  | 'fp1'
  | 'practice'
  | 'fp2'
  | 'q1'
  | 'q2'
  | 'sprint'
  | 'warmup'
  | 'race';

export interface MotogpWeekendSession {
  sessionKey: MotogpSessionKey | string;
  label: string;
  date: string | null;
  status: string | null;
  hasResults: boolean;
}

export const MOTOGP_SESSION_CONFIGS: Record<
  MotogpSessionKey,
  { label: string; longLabel: string }
> = {
  fp1: { label: 'FP1', longLabel: 'Free Practice 1' },
  practice: { label: 'PRACTICE', longLabel: 'Practice' },
  fp2: { label: 'FP2', longLabel: 'Free Practice 2' },
  q1: { label: 'Q1', longLabel: 'Qualifying 1' },
  q2: { label: 'Q2', longLabel: 'Qualifying 2' },
  sprint: { label: 'SPRINT', longLabel: 'Sprint' },
  warmup: { label: 'WARM-UP', longLabel: 'Warm Up' },
  race: { label: 'RACE', longLabel: 'Race' },
};

export const MOTOGP_SESSION_ORDER: MotogpSessionKey[] = [
  'fp1',
  'practice',
  'fp2',
  'q1',
  'q2',
  'sprint',
  'warmup',
  'race',
];

export function isMotogpSessionKey(value: string | null): value is MotogpSessionKey {
  return !!value && value in MOTOGP_SESSION_CONFIGS;
}

export function defaultMotogpSession(race: JolpikaCalendarRace | null): MotogpSessionKey {
  if (!race) return 'fp1';
  const raceTime = race.time ?? '23:59:59Z';
  const raceDate = new Date(`${race.date}T${raceTime}`);
  return Number.isFinite(raceDate.getTime()) && raceDate < new Date() ? 'race' : 'fp1';
}

export function sessionConfigLabel(key: string): string {
  if (isMotogpSessionKey(key)) return MOTOGP_SESSION_CONFIGS[key].longLabel;
  return key.toUpperCase();
}
