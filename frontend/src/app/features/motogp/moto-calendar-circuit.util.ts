import type { JolpikaCalendarRace } from '../f1-live/f1-live.types';
import { hasVerifiedCircuitOutlineForRace } from '../calendar/circuit-outline-lookup';
import { pickCircuitSvgUrl } from '../../shared/utils/circuit-path-from-svg.util';

/** La card puede pintar mapa si el race trae SVG Pulse o trazado GPS verificado. */
export function motoRaceHasCircuitMap(race: JolpikaCalendarRace): boolean {
  return (
    Boolean(pickCircuitSvgUrl(race.circuitSvgUrl)) ||
    hasVerifiedCircuitOutlineForRace(race)
  );
}
