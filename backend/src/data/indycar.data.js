export default {
  nextRace: {
    name: 'Iowa Speedway 250',
    circuit: 'Iowa Speedway',
    location: 'Newton, Iowa, USA',
    date: '2026-06-28T20:30:00Z',
    round: 10,
    totalRounds: 17,
    sessions: [
      { name: 'P1',    date: '27 Jun', time: '15:00' },
      { name: 'QUALY', date: '28 Jun', time: '17:00' },
      { name: 'RACE',  date: '28 Jun', time: '20:30', highlight: true },
    ],
  },
  standings: [
    { pos: 1, driver: 'J. Palou',      team: 'Chip Ganassi', points: 398, nationality: 'ES', teamColor: '#E31837' },
    { pos: 2, driver: 'S. McLaughlin', team: 'Penske',       points: 371, nationality: 'AU', teamColor: '#002D6C' },
    { pos: 3, driver: 'W. Power',      team: 'Penske',       points: 348, nationality: 'AU', teamColor: '#002D6C' },
    { pos: 4, driver: 'J. Dixon',      team: 'Chip Ganassi', points: 312, nationality: 'NZ', teamColor: '#E31837' },
    { pos: 5, driver: 'C. Kirkwood',   team: 'Andretti',     points: 289, nationality: 'US', teamColor: '#00843D' },
  ],
  constructors: [
    { pos: 1, team: 'Chip Ganassi', points: 710, color: '#E31837' },
    { pos: 2, team: 'Penske',       points: 719, color: '#002D6C' },
    { pos: 3, team: 'Andretti',     points: 534, color: '#00843D' },
    { pos: 4, team: 'Arrow McLaren', points: 389, color: '#FF8000' },
  ],
  lastRace: {
    name: 'Detroit Grand Prix',
    date: '1 Junio 2026',
    podium: [
      { pos: 1, driver: 'J. Palou',      time: '1:45:22.8',  team: 'Chip Ganassi', teamColor: '#E31837' },
      { pos: 2, driver: 'S. McLaughlin', time: '+1.234s',    team: 'Penske',       teamColor: '#002D6C' },
      { pos: 3, driver: 'C. Kirkwood',   time: '+4.567s',    team: 'Andretti',     teamColor: '#00843D' },
    ],
  },
  news: [
    { tag: 'ANÁLISIS', title: 'Palou refuerza su liderato en IndyCar tras su tercer triunfo de la temporada', time: 'Hace 1h', hot: true },
    { tag: 'TÉCNICA',  title: 'Dallara presenta el nuevo paquete aerodinámico para óvalos de alta velocidad', time: 'Hace 4h' },
    { tag: 'PADDOCK',  title: "McLaughlin: 'Iowa es donde ganamos la temporada pasada, volvemos a por ello'", time: 'Hace 7h' },
    { tag: 'MERCADO',  title: 'Rumores sobre la llegada de otro piloto europeo a IndyCar para 2027', time: 'Hace 11h' },
  ],
};
