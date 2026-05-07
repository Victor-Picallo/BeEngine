export default {
  nextRace: {
    name: 'Gran Premio de Cataluña',
    circuit: 'Circuit de Barcelona-Catalunya',
    location: 'Montmeló, España',
    date: '2026-05-31T13:00:00Z',
    round: 7,
    totalRounds: 22,
    sessions: [
      { name: 'FP1',    date: '29 May', time: '09:45' },
      { name: 'Q1/Q2',  date: '30 May', time: '14:50' },
      { name: 'SPRINT', date: '30 May', time: '15:00' },
      { name: 'RACE',   date: '31 May', time: '13:00', highlight: true },
    ],
  },
  standings: [
    { pos: 1, driver: 'F. Bagnaia',    team: 'Ducati',  points: 145, nationality: 'IT', teamColor: '#CC0000' },
    { pos: 2, driver: 'J. Martin',     team: 'Aprilia', points: 138, nationality: 'ES', teamColor: '#006B3C' },
    { pos: 3, driver: 'M. Márquez',    team: 'Ducati',  points: 127, nationality: 'ES', teamColor: '#CC0000' },
    { pos: 4, driver: 'B. Binder',     team: 'KTM',     points: 112, nationality: 'ZA', teamColor: '#FF6600' },
    { pos: 5, driver: 'E. Bastianini', team: 'Ducati',  points: 98,  nationality: 'IT', teamColor: '#CC0000' },
    { pos: 6, driver: 'A. Espargaro',  team: 'Honda',   points: 87,  nationality: 'ES', teamColor: '#CC0000' },
  ],
  constructors: [
    { pos: 1, team: 'Ducati',  points: 320, color: '#CC0000' },
    { pos: 2, team: 'Aprilia', points: 198, color: '#006B3C' },
    { pos: 3, team: 'KTM',     points: 167, color: '#FF6600' },
    { pos: 4, team: 'Yamaha',  points: 89,  color: '#003087' },
    { pos: 5, team: 'Honda',   points: 45,  color: '#CC0000' },
  ],
  lastRace: {
    name: 'GP Francia',
    date: '18 Mayo 2026',
    podium: [
      { pos: 1, driver: 'F. Bagnaia', time: '40:32.145', team: 'Ducati',  teamColor: '#CC0000' },
      { pos: 2, driver: 'M. Márquez', time: '+1.832s',   team: 'Ducati',  teamColor: '#CC0000' },
      { pos: 3, driver: 'J. Martin',  time: '+5.221s',   team: 'Aprilia', teamColor: '#006B3C' },
    ],
  },
  news: [
    { tag: 'ANÁLISIS', title: "Bagnaia arrasa en los test de Cataluña y avisa a sus rivales: 'Llego listo'", time: 'Hace 1h', hot: true },
    { tag: 'TÉCNICA',  title: 'Ducati desvela la nueva aerodinámica para Barcelona: más carga y menos drag', time: 'Hace 3h' },
    { tag: 'PADDOCK',  title: "Marc Márquez: 'El GP de Francia fue una enseñanza brutal, vengo con más hambre'", time: 'Hace 5h' },
    { tag: 'MERCADO',  title: 'Yamaha negocia con Quartararo para su regreso en 2027 con el nuevo prototipo', time: 'Hace 9h' },
  ],
};
