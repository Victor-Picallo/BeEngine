/**
 * Calendario F3 2026 (9 rondas, alineado con calendario oficial).
 * @typedef {{ round: number, raceName: string, circuitName: string, locality: string, country: string, date: string, time: string | null, sprintDate: string | null }} F3CalendarRace
 */

/** @type {F3CalendarRace[]} */
export const F3_CALENDAR_2026 = [
  { round: 1, raceName: 'Australian Grand Prix', circuitName: 'Albert Park Circuit', locality: 'Melbourne', country: 'Australia', date: '2026-03-08', time: '04:00:00Z', sprintDate: '2026-03-07' },
  { round: 2, raceName: 'Monaco Grand Prix', circuitName: 'Circuit de Monaco', locality: 'Monaco', country: 'Monaco', date: '2026-06-07', time: '12:00:00Z', sprintDate: '2026-06-06' },
  { round: 3, raceName: 'Spanish Grand Prix', circuitName: 'Circuit de Barcelona-Catalunya', locality: 'Montmeló', country: 'Spain', date: '2026-06-14', time: '12:00:00Z', sprintDate: '2026-06-13' },
  { round: 4, raceName: 'Austrian Grand Prix', circuitName: 'Red Bull Ring', locality: 'Spielberg', country: 'Austria', date: '2026-06-28', time: '12:00:00Z', sprintDate: '2026-06-27' },
  { round: 5, raceName: 'British Grand Prix', circuitName: 'Silverstone Circuit', locality: 'Silverstone', country: 'UK', date: '2026-07-05', time: '13:00:00Z', sprintDate: '2026-07-04' },
  { round: 6, raceName: 'Belgian Grand Prix', circuitName: 'Circuit de Spa-Francorchamps', locality: 'Spa-Francorchamps', country: 'Belgium', date: '2026-07-19', time: '12:00:00Z', sprintDate: '2026-07-18' },
  { round: 7, raceName: 'Hungarian Grand Prix', circuitName: 'Hungaroring', locality: 'Budapest', country: 'Hungary', date: '2026-07-26', time: '12:00:00Z', sprintDate: '2026-07-25' },
  { round: 8, raceName: 'Italian Grand Prix', circuitName: 'Monza Circuit', locality: 'Monza', country: 'Italy', date: '2026-09-06', time: '12:00:00Z', sprintDate: '2026-09-05' },
  { round: 9, raceName: 'Madrid Grand Prix', circuitName: 'Madring', locality: 'Madrid', country: 'Spain', date: '2026-09-13', time: '12:00:00Z', sprintDate: '2026-09-12' },
];

/** Última ronda con resultados registrados en BeEngine. */
export const F3_LAST_COMPLETED_ROUND = 1;
