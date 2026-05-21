/**
 * Resultados F3 2026 (feature race, clasificación completa) — Melbourne R1.
 * @typedef {{ position: number, driverId: string, driver: string, team: string, constructorId: string, grid: number, laps: number, status: string, points: number, time: string | null }} F3ResultRow
 * @typedef {{ round: number, raceName: string, circuitName: string, date: string, results: F3ResultRow[] }} F3RaceResult
 */

/** @type {Record<number, F3RaceResult>} */
export const F3_RACE_RESULTS_2026 = {
  1: {
    round: 1,
    raceName: 'Australian Grand Prix',
    circuitName: 'Albert Park Circuit',
    date: '2026-03-08',
    results: [
      { position: 1, driverId: 'ugochukwu', driver: 'Ugo Ugochukwu', team: 'Campos Racing', constructorId: 'campos', grid: 2, laps: 28, status: 'Finished', points: 25, time: '42:59.653' },
      { position: 2, driverId: 'slater', driver: 'Freddie Slater', team: 'Trident', constructorId: 'trident', grid: 3, laps: 28, status: 'Finished', points: 18, time: '+0.693' },
      { position: 3, driverId: 'kato', driver: 'Taito Kato', team: 'ART Grand Prix', constructorId: 'art', grid: 10, laps: 28, status: 'Finished', points: 15, time: '+2.272' },
      { position: 4, driverId: 'del_pino', driver: 'Bruno del Pino', team: 'Van Amersfoort Racing', constructorId: 'van_amersfoort', grid: 1, laps: 28, status: 'Finished', points: 12, time: '+2.716' },
      { position: 5, driverId: 'gladysz', driver: 'Maciej Gładysz', team: 'ART Grand Prix', constructorId: 'art', grid: 6, laps: 28, status: 'Finished', points: 10, time: '+3.253' },
      { position: 6, driverId: 'deligny', driver: 'Enzo Deligny', team: 'Van Amersfoort Racing', constructorId: 'van_amersfoort', grid: 15, laps: 28, status: 'Finished', points: 8, time: '+3.576' },
      { position: 7, driverId: 'benavides', driver: 'Brad Benavides', team: 'AIX Racing', constructorId: 'aix', grid: 17, laps: 28, status: 'Finished', points: 6, time: '+4.716' },
      { position: 8, driverId: 'clerot', driver: 'Pedro Clerot', team: 'Rodin Motorsport', constructorId: 'rodin', grid: 14, laps: 28, status: 'Finished', points: 4, time: '+4.963' },
      { position: 9, driverId: 'nakamura', driver: 'Jin Nakamura', team: 'Hitech', constructorId: 'hitech', grid: 13, laps: 28, status: 'Finished', points: 2, time: '+5.346' },
      { position: 10, driverId: 'colnaghi', driver: 'Mattia Colnaghi', team: 'MP Motorsport', constructorId: 'mp_motorsport', grid: 12, laps: 28, status: 'Finished', points: 1, time: '+5.784' },
      { position: 11, driverId: 'yamakoshi', driver: 'Hiyu Yamakoshi', team: 'Van Amersfoort Racing', constructorId: 'van_amersfoort', grid: 15, laps: 28, status: 'Finished', points: 0, time: '+5.983' },
      { position: 12, driverId: 'nael', driver: 'Théophile Naël', team: 'Campos Racing', constructorId: 'campos', grid: 12, laps: 28, status: 'Finished', points: 0, time: '+6.290' },
      { position: 13, driverId: 'taponen', driver: 'Tuukka Taponen', team: 'MP Motorsport', constructorId: 'mp_motorsport', grid: 17, laps: 28, status: 'Finished', points: 0, time: '+6.529' },
      { position: 14, driverId: 'mclaughlin', driver: 'Fionn McLaughlin', team: 'Hitech', constructorId: 'hitech', grid: 18, laps: 28, status: 'Finished', points: 0, time: '+6.802' },
      { position: 15, driverId: 'giusti', driver: 'Alessandro Giusti', team: 'MP Motorsport', constructorId: 'mp_motorsport', grid: 19, laps: 28, status: 'Finished', points: 0, time: '+7.218' },
      { position: 16, driverId: 'badoer', driver: 'Brando Badoer', team: 'Rodin Motorsport', constructorId: 'rodin', grid: 11, laps: 28, status: 'Finished', points: 0, time: '+7.778' },
      { position: 17, driverId: 'heuzenroeder', driver: 'Patrick Heuzenroeder', team: 'Campos Racing', constructorId: 'campos', grid: 21, laps: 28, status: 'Finished', points: 0, time: '+8.483' },
      { position: 18, driverId: 'barrichello', driver: 'Fernando Barrichello', team: 'AIX Racing', constructorId: 'aix', grid: 23, laps: 28, status: 'Finished', points: 0, time: '+8.836' },
      { position: 19, driverId: 'xie', driver: 'Gerrard Xie', team: 'DAMS Lucas Oil', constructorId: 'dams', grid: 24, laps: 28, status: 'Finished', points: 0, time: '+9.401' },
      { position: 20, driverId: 'david', driver: 'Yevan David', team: 'AIX Racing', constructorId: 'aix', grid: 25, laps: 28, status: 'Finished', points: 0, time: '+9.977' },
      { position: 21, driverId: 'ho', driver: 'Christian Ho', team: 'Rodin Motorsport', constructorId: 'rodin', grid: 22, laps: 28, status: 'Finished', points: 0, time: '+10.473' },
      { position: 22, driverId: 'de_palo', driver: 'Matteo De Palo', team: 'Trident', constructorId: 'trident', grid: 26, laps: 28, status: 'Finished', points: 0, time: '+11.182' },
      { position: 23, driverId: 'stromsted', driver: 'Noah Strømsted', team: 'Trident', constructorId: 'trident', grid: 4, laps: 28, status: 'Finished', points: 0, time: '+11.621' },
      { position: 24, driverId: 'garfias', driver: 'José Garfias', team: 'Prema Racing', constructorId: 'prema', grid: 27, laps: 28, status: 'Finished', points: 0, time: '+11.871' },
      { position: 25, driverId: 'lacorte', driver: 'Nicola Lacorte', team: 'DAMS Lucas Oil', constructorId: 'dams', grid: 16, laps: 28, status: 'Finished', points: 0, time: '+19.142' },
      { position: 26, driverId: 'wharton', driver: 'James Wharton', team: 'Prema Racing', constructorId: 'prema', grid: 14, laps: 0, status: 'DNS', points: 0, time: null },
      { position: 27, driverId: 'sharp', driver: 'Louis Sharp', team: 'Prema Racing', constructorId: 'prema', grid: 20, laps: 0, status: 'DNS', points: 0, time: null },
      { position: 28, driverId: 'shin', driver: 'Michael Shin', team: 'Hitech', constructorId: 'hitech', grid: 28, laps: 0, status: 'DNF', points: 0, time: null },
      { position: 29, driverId: 'bhirombhakdi', driver: 'Nandhavud Bhirombhakdi', team: 'DAMS Lucas Oil', constructorId: 'dams', grid: 30, laps: 0, status: 'DNF', points: 0, time: null },
      { position: 30, driverId: 'le', driver: 'Kanato Le', team: 'ART Grand Prix', constructorId: 'art', grid: 29, laps: 0, status: 'DNF', points: 0, time: null },
    ],
  },
};
