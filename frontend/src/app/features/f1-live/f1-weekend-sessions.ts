import type { JolpikaCalendarRace, OpenF1Session } from './f1-live.types';

const norm = (s: string): string =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

type RaceWeekendProbe = Pick<JolpikaCalendarRace, 'locality' | 'country' | 'circuitName' | 'raceName'>;

/** OpenF1 × Jolpika weekend linkage (locality/country wording differ, e.g. Miami vs Miami Gardens, USA vs United States). */
export function sessionsForRaceWeekend(
  sessions: OpenF1Session[],
  race: RaceWeekendProbe,
): OpenF1Session[] {
  if (!sessions.length) return [];

  const raceLocality = norm(race.locality || '');
  const raceCountry  = norm(race.country  || '');
  const raceHay      = [race.raceName, race.circuitName, race.locality]
    .filter(Boolean)
    .map(norm)
    .join(' ');

  const pickOneMeeting = (cands: OpenF1Session[]): OpenF1Session[] => {
    if (!cands.length) return [];
    return new Set(cands.map(s => s.meetingKey)).size === 1 ? cands : [];
  };

  const localityOverlaps = (s: OpenF1Session): boolean => {
    const sLoc = norm(s.location || '');
    if (!raceLocality || !sLoc) return false;
    return sLoc === raceLocality || sLoc.includes(raceLocality) || raceLocality.includes(sLoc);
  };

  const circuitShortOverlaps = (s: OpenF1Session): boolean => {
    const sh = norm(s.circuitShortName || '');
    if (sh.length < 3) return false;
    return raceHay.includes(sh);
  };

  const countryAligned = (s: OpenF1Session): boolean => {
    const cn = norm(s.countryName || '');
    if (!raceCountry || !cn) return false;
    if (cn === raceCountry) return true;
    const us = new Set(['usa', 'us', 'united states', 'united states of america']);
    return us.has(cn) && us.has(raceCountry);
  };

  if (raceLocality) {
    const exact = pickOneMeeting(
      sessions.filter(s => norm(s.location || '') === raceLocality),
    );
    if (exact.length) return exact;
    const partial = pickOneMeeting(sessions.filter(localityOverlaps));
    if (partial.length) return partial;
  }

  const byCircuit = pickOneMeeting(sessions.filter(circuitShortOverlaps));
  if (byCircuit.length) return byCircuit;

  if (!raceCountry) return [];
  const byCountry = sessions.filter(countryAligned);
  const oneCountry = pickOneMeeting(byCountry);
  if (oneCountry.length) return oneCountry;

  const narrowLocal = pickOneMeeting(byCountry.filter(localityOverlaps));
  if (narrowLocal.length) return narrowLocal;
  const narrowCirc  = pickOneMeeting(byCountry.filter(circuitShortOverlaps));
  if (narrowCirc.length) return narrowCirc;

  return [];
}
