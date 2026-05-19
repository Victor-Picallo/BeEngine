/**
 * Resultados F2 2026 (feature race, top 10) — curados tras cada GP.
 * @typedef {{ position: number, driverId: string, driver: string, team: string, constructorId: string, grid: number, laps: number, status: string, points: number, time: string | null }} F2ResultRow
 * @typedef {{ round: number, raceName: string, circuitName: string, date: string, results: F2ResultRow[] }} F2RaceResult
 */

/** @type {Record<number, F2RaceResult>} */
export const F2_RACE_RESULTS_2026 = {
  1: {
    round: 1,
    raceName: 'Australian Grand Prix',
    circuitName: 'Albert Park Circuit',
    date: '2026-03-08',
    results: [
      { position: 1, driverId: 'tsolov', driver: 'Nikola Tsolov', team: 'Campos Racing', constructorId: 'campos', grid: 8, laps: 33, status: 'Finished', points: 25, time: '1:32:14.521' },
      { position: 2, driverId: 'camara', driver: 'Rafael Câmara', team: 'Invicta Racing', constructorId: 'invicta', grid: 2, laps: 33, status: 'Finished', points: 18, time: '+2.341' },
      { position: 3, driverId: 'van_hoepen', driver: 'Laurens van Hoepen', team: 'Trident', constructorId: 'trident', grid: 11, laps: 33, status: 'Finished', points: 15, time: '+4.102' },
      { position: 4, driverId: 'inthraphuvasak', driver: 'Tasanapol Inthraphuvasak', team: 'ART Grand Prix', constructorId: 'art', grid: 10, laps: 33, status: 'Finished', points: 12, time: '+5.887' },
      { position: 5, driverId: 'miyata', driver: 'Ritomo Miyata', team: 'Hitech', constructorId: 'hitech', grid: 5, laps: 33, status: 'Finished', points: 10, time: '+7.221' },
      { position: 6, driverId: 'leon', driver: 'Noel León', team: 'Campos Racing', constructorId: 'campos', grid: 7, laps: 33, status: 'Finished', points: 8, time: '+9.004' },
      { position: 7, driverId: 'durksen', driver: 'Joshua Dürksen', team: 'Invicta Racing', constructorId: 'invicta', grid: 1, laps: 33, status: 'Finished', points: 6, time: '+11.330' },
      { position: 8, driverId: 'dunne', driver: 'Alex Dunne', team: 'Rodin Motorsport', constructorId: 'rodin', grid: 3, laps: 33, status: 'Finished', points: 4, time: '+12.991' },
      { position: 9, driverId: 'goethe', driver: 'Oliver Goethe', team: 'MP Motorsport', constructorId: 'mp_motorsport', grid: 4, laps: 33, status: 'Finished', points: 2, time: '+14.220' },
      { position: 10, driverId: 'maini', driver: 'Kush Maini', team: 'ART Grand Prix', constructorId: 'art', grid: 12, laps: 33, status: 'Finished', points: 1, time: '+16.881' },
    ],
  },
  2: {
    round: 2,
    raceName: 'Miami Grand Prix',
    circuitName: 'Miami International Autodrome',
    date: '2026-05-03',
    results: [
      { position: 1, driverId: 'mini', driver: 'Gabriele Minì', team: 'MP Motorsport', constructorId: 'mp_motorsport', grid: 3, laps: 32, status: 'Finished', points: 25, time: '1:28:44.102' },
      { position: 2, driverId: 'tsolov', driver: 'Nikola Tsolov', team: 'Campos Racing', constructorId: 'campos', grid: 1, laps: 32, status: 'Finished', points: 18, time: '+1.887' },
      { position: 3, driverId: 'camara', driver: 'Rafael Câmara', team: 'Invicta Racing', constructorId: 'invicta', grid: 2, laps: 32, status: 'Finished', points: 15, time: '+3.441' },
      { position: 4, driverId: 'van_hoepen', driver: 'Laurens van Hoepen', team: 'Trident', constructorId: 'trident', grid: 4, laps: 32, status: 'Finished', points: 12, time: '+5.102' },
      { position: 5, driverId: 'miyata', driver: 'Ritomo Miyata', team: 'Hitech', constructorId: 'hitech', grid: 6, laps: 32, status: 'Finished', points: 10, time: '+7.004' },
      { position: 6, driverId: 'beganovic', driver: 'Dino Beganovic', team: 'DAMS Lucas Oil', constructorId: 'dams', grid: 5, laps: 32, status: 'Finished', points: 8, time: '+8.771' },
      { position: 7, driverId: 'leon', driver: 'Noel León', team: 'Campos Racing', constructorId: 'campos', grid: 8, laps: 32, status: 'Finished', points: 6, time: '+10.220' },
      { position: 8, driverId: 'herta', driver: 'Colton Herta', team: 'Hitech', constructorId: 'hitech', grid: 7, laps: 32, status: 'Finished', points: 4, time: '+12.110' },
      { position: 9, driverId: 'durksen', driver: 'Joshua Dürksen', team: 'Invicta Racing', constructorId: 'invicta', grid: 9, laps: 32, status: 'Finished', points: 2, time: '+14.881' },
      { position: 10, driverId: 'inthraphuvasak', driver: 'Tasanapol Inthraphuvasak', team: 'ART Grand Prix', constructorId: 'art', grid: 10, laps: 32, status: 'Finished', points: 1, time: '+16.004' },
    ],
  },
};