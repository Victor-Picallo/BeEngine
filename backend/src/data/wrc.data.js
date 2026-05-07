export default {
  nextRace: {
    name: 'Safari Rally Kenya',
    circuit: 'Naivasha Service Park',
    location: 'Naivasha, Kenya',
    date: '2026-06-26T06:00:00Z',
    round: 8,
    totalRounds: 13,
    sessions: [
      { name: 'SS1',   date: '25 Jun', time: '07:00' },
      { name: 'SS2',   date: '25 Jun', time: '10:30' },
      { name: 'SS3',   date: '26 Jun', time: '08:00' },
      { name: 'POWER', date: '26 Jun', time: '14:00', highlight: true },
    ],
  },
  standings: [
    { pos: 1, driver: 'K. Rovanperä', team: 'Toyota',   points: 142, nationality: 'FI', teamColor: '#EB0A1E' },
    { pos: 2, driver: 'S. Ogier',     team: 'Toyota',   points: 128, nationality: 'FR', teamColor: '#EB0A1E' },
    { pos: 3, driver: 'O. Tänak',     team: 'Hyundai',  points: 115, nationality: 'EE', teamColor: '#003087' },
    { pos: 4, driver: 'T. Neuville',  team: 'Hyundai',  points: 98,  nationality: 'BE', teamColor: '#003087' },
    { pos: 5, driver: 'E. Evans',     team: 'Toyota',   points: 87,  nationality: 'NZ', teamColor: '#EB0A1E' },
  ],
  constructors: [
    { pos: 1, team: 'Toyota',  points: 357, color: '#EB0A1E' },
    { pos: 2, team: 'Hyundai', points: 213, color: '#003087' },
    { pos: 3, team: 'Ford',    points: 145, color: '#00274C' },
  ],
  lastRace: {
    name: 'Rally de Portugal',
    date: '19 Mayo 2026',
    podium: [
      { pos: 1, driver: 'K. Rovanperä', time: '3:24:12.4', team: 'Toyota',  teamColor: '#EB0A1E' },
      { pos: 2, driver: 'S. Ogier',     time: '+18.5s',    team: 'Toyota',  teamColor: '#EB0A1E' },
      { pos: 3, driver: 'T. Neuville',  time: '+34.2s',    team: 'Hyundai', teamColor: '#003087' },
    ],
  },
  news: [
    { tag: 'ANÁLISIS', title: 'Rovanperä arrasa en Portugal y amplía su ventaja en el campeonato WRC', time: 'Hace 2h', hot: true },
    { tag: 'TÉCNICA',  title: 'Toyota revela las modificaciones de suspensión para los rallyes africanos', time: 'Hace 6h' },
    { tag: 'PADDOCK',  title: "Tänak: 'Necesitamos ser perfectos en Kenya para recortar distancias'", time: 'Hace 9h' },
    { tag: 'MERCADO',  title: 'Citroen estudia su regreso al WRC para la temporada 2027', time: 'Hace 14h' },
  ],
};
