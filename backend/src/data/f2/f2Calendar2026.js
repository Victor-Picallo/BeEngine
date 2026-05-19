/**
 * Calendario F2 2026 (14 rondas). Fechas alineadas con el calendario oficial.
 * @typedef {{ round: number, raceName: string, circuitName: string, locality: string, country: string, date: string, time: string | null, sprintDate: string | null }} F2CalendarRace
 */

/** @type {F2CalendarRace[]} */
export const F2_CALENDAR_2026 = [
  { round: 1, raceName: 'Australian Grand Prix', circuitName: 'Albert Park Circuit', locality: 'Melbourne', country: 'Australia', date: '2026-03-08', time: '05:00:00Z', sprintDate: '2026-03-07' },
  { round: 2, raceName: 'Miami Grand Prix', circuitName: 'Miami International Autodrome', locality: 'Miami Gardens', country: 'USA', date: '2026-05-03', time: '20:00:00Z', sprintDate: '2026-05-02' },
  { round: 3, raceName: 'Canadian Grand Prix', circuitName: 'Circuit Gilles Villeneuve', locality: 'Montreal', country: 'Canada', date: '2026-05-24', time: '18:00:00Z', sprintDate: '2026-05-23' },
  { round: 4, raceName: 'Monaco Grand Prix', circuitName: 'Circuit de Monaco', locality: 'Monaco', country: 'Monaco', date: '2026-06-07', time: '13:00:00Z', sprintDate: '2026-06-06' },
  { round: 5, raceName: 'Spanish Grand Prix', circuitName: 'Circuit de Barcelona-Catalunya', locality: 'Montmeló', country: 'Spain', date: '2026-06-14', time: '13:00:00Z', sprintDate: '2026-06-13' },
  { round: 6, raceName: 'Austrian Grand Prix', circuitName: 'Red Bull Ring', locality: 'Spielberg', country: 'Austria', date: '2026-06-28', time: '13:00:00Z', sprintDate: '2026-06-27' },
  { round: 7, raceName: 'British Grand Prix', circuitName: 'Silverstone Circuit', locality: 'Silverstone', country: 'UK', date: '2026-07-05', time: '14:00:00Z', sprintDate: '2026-07-04' },
  { round: 8, raceName: 'Belgian Grand Prix', circuitName: 'Circuit de Spa-Francorchamps', locality: 'Spa-Francorchamps', country: 'Belgium', date: '2026-07-19', time: '13:00:00Z', sprintDate: '2026-07-18' },
  { round: 9, raceName: 'Hungarian Grand Prix', circuitName: 'Hungaroring', locality: 'Budapest', country: 'Hungary', date: '2026-07-26', time: '13:00:00Z', sprintDate: '2026-07-25' },
  { round: 10, raceName: 'Italian Grand Prix', circuitName: 'Monza Circuit', locality: 'Monza', country: 'Italy', date: '2026-09-06', time: '13:00:00Z', sprintDate: '2026-09-05' },
  { round: 11, raceName: 'Madrid Grand Prix', circuitName: 'Madring', locality: 'Madrid', country: 'Spain', date: '2026-09-13', time: '13:00:00Z', sprintDate: '2026-09-12' },
  { round: 12, raceName: 'Azerbaijan Grand Prix', circuitName: 'Baku City Circuit', locality: 'Baku', country: 'Azerbaijan', date: '2026-09-26', time: '11:00:00Z', sprintDate: '2026-09-25' },
  { round: 13, raceName: 'Qatar Grand Prix', circuitName: 'Lusail International Circuit', locality: 'Lusail', country: 'Qatar', date: '2026-11-29', time: '16:00:00Z', sprintDate: '2026-11-28' },
  { round: 14, raceName: 'Abu Dhabi Grand Prix', circuitName: 'Yas Marina Circuit', locality: 'Abu Dhabi', country: 'UAE', date: '2026-12-06', time: '16:00:00Z', sprintDate: '2026-12-05' },
];

/** Última ronda con resultados registrados en BeEngine. */
export const F2_LAST_COMPLETED_ROUND = 2;
