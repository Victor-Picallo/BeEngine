export default {
  nextRace: {
    name: 'Gran Premio de Mónaco',
    circuit: 'Circuit de Monaco',
    location: 'Montecarlo, Mónaco',
    date: '2026-05-25T13:00:00Z',
    round: 8,
    totalRounds: 24,
    sessions: [
      { name: 'FP1',   date: '23 May', time: '13:30' },
      { name: 'FP2',   date: '23 May', time: '17:00' },
      { name: 'FP3',   date: '24 May', time: '12:30' },
      { name: 'QUALY', date: '24 May', time: '16:00' },
      { name: 'RACE',  date: '25 May', time: '15:00', highlight: true },
    ],
  },
  standings: [
    { pos: 1, driver: 'M. Verstappen', team: 'Red Bull',     points: 161, nationality: 'NL', teamColor: '#1E3A5F' },
    { pos: 2, driver: 'L. Hamilton',   team: 'Ferrari',      points: 148, nationality: 'GB', teamColor: '#E8002D' },
    { pos: 3, driver: 'C. Leclerc',    team: 'Ferrari',      points: 137, nationality: 'MC', teamColor: '#E8002D' },
    { pos: 4, driver: 'L. Norris',     team: 'McLaren',      points: 129, nationality: 'GB', teamColor: '#FF8000' },
    { pos: 5, driver: 'C. Sainz',      team: 'Williams',     points: 108, nationality: 'ES', teamColor: '#00A3E0' },
    { pos: 6, driver: 'G. Russell',    team: 'Mercedes',     points: 95,  nationality: 'GB', teamColor: '#00D2BE' },
    { pos: 7, driver: 'F. Alonso',     team: 'Aston Martin', points: 82,  nationality: 'ES', teamColor: '#006F62' },
    { pos: 8, driver: 'O. Piastri',    team: 'McLaren',      points: 79,  nationality: 'AU', teamColor: '#FF8000' },
  ],
  constructors: [
    { pos: 1, team: 'Red Bull Racing', points: 267, color: '#1E3A5F' },
    { pos: 2, team: 'Ferrari',         points: 285, color: '#E8002D' },
    { pos: 3, team: 'McLaren',         points: 208, color: '#FF8000' },
    { pos: 4, team: 'Mercedes',        points: 177, color: '#00D2BE' },
    { pos: 5, team: 'Aston Martin',    points: 102, color: '#006F62' },
  ],
  lastRace: {
    name: 'GP España',
    date: '11 Mayo 2026',
    podium: [
      { pos: 1, driver: 'M. Verstappen', time: '1:32:14.523', team: 'Red Bull',  teamColor: '#1E3A5F' },
      { pos: 2, driver: 'C. Leclerc',    time: '+4.231s',     team: 'Ferrari',   teamColor: '#E8002D' },
      { pos: 3, driver: 'L. Norris',     time: '+8.719s',     team: 'McLaren',   teamColor: '#FF8000' },
    ],
  },
  news: [
    { tag: 'ANÁLISIS', title: 'Verstappen domina los libres en Mónaco con una vuelta de récord absoluto', time: 'Hace 2h', hot: true },
    { tag: 'TÉCNICA',  title: 'Red Bull presenta actualizaciones clave en el fondo plano para el GP de Mónaco', time: 'Hace 4h' },
    { tag: 'PADDOCK',  title: "Hamilton revela sus sensaciones con el Ferrari: 'Este coche tiene algo especial'", time: 'Hace 6h' },
    { tag: 'MERCADO',  title: 'Alpine confirma a Doohan para las próximas 5 temporadas en un acuerdo histórico', time: 'Hace 8h' },
  ],
};
