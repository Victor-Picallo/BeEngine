import type { JolpikaCalendarRace, JolpikaRaceResult } from '../f1-live/f1-live.types';
import { findOfficialCircuit } from '../calendar/official-circuits';

const norm = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Pulse / livetiming labels like «BARCELONA TEST» — not a circuit name. */
export const isTestEventLabel = (name: string | null | undefined): boolean =>
  /\btest\b/i.test(String(name ?? '').trim());

export const resolveFeederCircuitName = (
  race: JolpikaCalendarRace | null | undefined,
  result?: JolpikaRaceResult | null,
): string => {
  const candidates = [
    race?.circuitName,
    result?.circuitName,
    findOfficialCircuit(race?.circuitName ?? '')?.name,
    findOfficialCircuit(race?.locality ?? '')?.name,
  ];

  const eventLabels = [race?.raceName, result?.raceName].filter(Boolean) as string[];

  for (const raw of candidates) {
    const label = String(raw ?? '').trim();
    if (!label || isTestEventLabel(label)) continue;
    if (eventLabels.some((ev) => norm(label) === norm(ev))) continue;
    return label;
  }

  const locality = race?.locality?.trim();
  return locality || '—';
};

export const resolveFeederRaceName = (
  race: JolpikaCalendarRace | null | undefined,
  result?: JolpikaRaceResult | null,
): string => {
  const calendarName = race?.raceName?.trim() ?? '';
  const resultName = result?.raceName?.trim() ?? '';

  if (resultName && !isTestEventLabel(resultName)) return resultName;
  if (calendarName) return calendarName;
  if (resultName) return resultName;
  return '';
};
