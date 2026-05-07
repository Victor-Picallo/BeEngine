export default {
  nextRace: {
    name: 'E-Prix de Berlín',
    circuit: 'Tempelhof Airport Circuit',
    location: 'Berlín, Alemania',
    date: '2026-06-20T14:00:00Z',
    round: 5,
    totalRounds: 16,
    sessions: [
      { name: 'FP1',   date: '19 Jun', time: '10:00' },
      { name: 'QUALY', date: '20 Jun', time: '11:00' },
      { name: 'RACE',  date: '20 Jun', time: '14:00', highlight: true },
    ],
  },
  standings: [
    { pos: 1, driver: 'J. Cassidy',   team: 'Jaguar',   points: 89, nationality: 'GB', teamColor: '#00A651' },
    { pos: 2, driver: 'P. Wehrlein',  team: 'Porsche',  points: 78, nationality: 'DE', teamColor: '#CC0000' },
    { pos: 3, driver: 'N. de Vries',  team: 'Maserati', points: 65, nationality: 'NL', teamColor: '#003087' },
    { pos: 4, driver: 'E. Mortara',   team: 'Mahindra', points: 54, nationality: 'CH', teamColor: '#E41B17' },
    { pos: 5, driver: 'S. Buemi',     team: 'Envision', points: 43, nationality: 'CH', teamColor: '#00B0CA' },
  ],
  constructors: [
    { pos: 1, team: 'Jaguar',   points: 142, color: '#00A651' },
    { pos: 2, team: 'Porsche',  points: 120, color: '#CC0000' },
    { pos: 3, team: 'Maserati', points: 89,  color: '#003087' },
    { pos: 4, team: 'Mahindra', points: 67,  color: '#E41B17' },
    { pos: 5, team: 'Envision', points: 55,  color: '#00B0CA' },
  ],
  lastRace: {
    name: 'E-Prix de Mónaco',
    date: '4 Mayo 2026',
    podium: [
      { pos: 1, driver: 'J. Cassidy',  time: '45:12.345', team: 'Jaguar',   teamColor: '#00A651' },
      { pos: 2, driver: 'P. Wehrlein', time: '+2.341s',   team: 'Porsche',  teamColor: '#CC0000' },
      { pos: 3, driver: 'N. de Vries', time: '+5.678s',   team: 'Maserati', teamColor: '#003087' },
    ],
  },
  news: [
    { tag: 'ANÁLISIS', title: 'Cassidy lidera el campeonato de Formula E tras la victoria en Mónaco', time: 'Hace 3h', hot: true },
    { tag: 'TÉCNICA',  title: 'Las nuevas especificaciones de batería Gen4 cambian el juego en Formula E', time: 'Hace 5h' },
    { tag: 'PADDOCK',  title: "Wehrlein: 'Berlín es nuestro circuito favorito, llegaremos preparados'", time: 'Hace 8h' },
    { tag: 'MERCADO',  title: 'Rumores de llegada de Ferrari a la Formula E para 2028', time: 'Hace 12h' },
  ],
};
