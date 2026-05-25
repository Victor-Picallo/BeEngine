/**
 * Resultados F1 2026 (fallback local si Jolpica no responde).
 * @typedef {{ position: number, driverId: string, driver: string, team: string, constructorId: string, grid: number, laps: number, status: string, points: number, time: string | null }} F1ResultRow
 * @typedef {{ round: number, raceName: string, circuitName: string, date: string, results: F1ResultRow[] }} F1RaceResult
 */

/** @type {Record<number, F1RaceResult>} */
export const F1_RACE_RESULTS_2026 = {
  7: {
    round: 7,
    raceName: 'Spanish Grand Prix',
    circuitName: 'Circuit de Barcelona-Catalunya',
    date: '2026-05-11',
    results: [
      { position: 1, driverId: 'max_verstappen', driver: 'Max Verstappen', team: 'Red Bull Racing', constructorId: 'red_bull', grid: 1, laps: 66, status: 'Finished', points: 25, time: '1:32:14.523' },
      { position: 2, driverId: 'leclerc', driver: 'Charles Leclerc', team: 'Ferrari', constructorId: 'ferrari', grid: 3, laps: 66, status: 'Finished', points: 18, time: '+4.231' },
      { position: 3, driverId: 'norris', driver: 'Lando Norris', team: 'McLaren', constructorId: 'mclaren', grid: 2, laps: 66, status: 'Finished', points: 15, time: '+8.719' },
      { position: 4, driverId: 'piastri', driver: 'Oscar Piastri', team: 'McLaren', constructorId: 'mclaren', grid: 4, laps: 66, status: 'Finished', points: 12, time: '+12.100' },
      { position: 5, driverId: 'hamilton', driver: 'Lewis Hamilton', team: 'Ferrari', constructorId: 'ferrari', grid: 5, laps: 66, status: 'Finished', points: 10, time: '+18.400' },
      { position: 6, driverId: 'russell', driver: 'George Russell', team: 'Mercedes', constructorId: 'mercedes', grid: 6, laps: 66, status: 'Finished', points: 8, time: '+22.050' },
      { position: 7, driverId: 'alonso', driver: 'Fernando Alonso', team: 'Aston Martin', constructorId: 'aston_martin', grid: 8, laps: 66, status: 'Finished', points: 6, time: '+28.331' },
      { position: 8, driverId: 'sainz', driver: 'Carlos Sainz', team: 'Williams', constructorId: 'williams', grid: 7, laps: 66, status: 'Finished', points: 4, time: '+31.002' },
    ],
  },
};

export const F1_LAST_COMPLETED_ROUND = 7;
