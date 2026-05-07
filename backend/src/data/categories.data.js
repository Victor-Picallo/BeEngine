export const CATEGORIES = [
  { id: 'f1',      label: 'Formula 1',  short: 'F1',     accent: '#FFD100' },
  { id: 'motogp',  label: 'MotoGP',     short: 'MotoGP', accent: '#0052CC' },
  { id: 'fe',      label: 'Formula E',  short: 'FE',     accent: '#00C8FF' },
  { id: 'wrc',     label: 'WRC',        short: 'WRC',    accent: '#FF8C00' },
  { id: 'indycar', label: 'IndyCar',    short: 'INDY',   accent: '#B8002D' },
];

export const VALID_CATEGORIES = CATEGORIES.map(c => c.id);
