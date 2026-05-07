export interface Category {
  id: string;
  label: string;
  short: string;
  accent: string;
}

export interface Session {
  name: string;
  date: string;
  time: string;
  highlight?: boolean;
}

export interface NextRace {
  name: string;
  circuit: string;
  location: string;
  date: string;
  round: number;
  totalRounds: number;
  sessions: Session[];
}

export interface Driver {
  pos: number;
  driver: string;
  team: string;
  points: number;
  nationality: string;
  teamColor: string;
}

export interface Constructor {
  pos: number;
  team: string;
  points: number;
  color: string;
}

export interface PodiumEntry {
  pos: number;
  driver: string;
  time: string;
  team: string;
  teamColor: string;
}

export interface LastRace {
  name: string;
  date: string;
  podium: PodiumEntry[];
}

export interface NewsItem {
  tag: string;
  title: string;
  time: string;
  hot?: boolean;
}

export interface CategoryData {
  nextRace: NextRace;
  standings: Driver[];
  constructors: Constructor[];
  lastRace: LastRace;
  news: NewsItem[];
}

export interface CountdownTime {
  d: number;
  h: number;
  m: number;
  s: number;
}

export interface Favorite {
  name: string;
  sub: string;
}

export function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

export const CATEGORIES: Category[] = [
  { id: 'f1',      label: 'Formula 1',  short: 'F1',     accent: '#FFD100' },
  { id: 'motogp',  label: 'MotoGP',     short: 'MotoGP', accent: '#0052CC' },
  { id: 'fe',      label: 'Formula E',  short: 'FE',     accent: '#00C8FF' },
  { id: 'wrc',     label: 'WRC',        short: 'WRC',    accent: '#FF8C00' },
  { id: 'indycar', label: 'IndyCar',    short: 'INDY',   accent: '#B8002D' },
];

export const FLAG_MAP: Record<string, string> = {
  NL: '🇳🇱', GB: '🇬🇧', MC: '🇲🇨', ES: '🇪🇸', AU: '🇦🇺', IT: '🇮🇹', ZA: '🇿🇦',
};

export const F1_DATA: CategoryData = {
  nextRace: {
    name: 'Gran Premio de Mónaco',
    circuit: 'Circuit de Monaco',
    location: 'Montecarlo, Mónaco',
    date: '2026-05-25T13:00:00Z',
    round: 8, totalRounds: 24,
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
    name: 'GP España', date: '11 Mayo 2026',
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

export const MOTOGP_DATA: CategoryData = {
  nextRace: {
    name: 'Gran Premio de Cataluña',
    circuit: 'Circuit de Barcelona-Catalunya',
    location: 'Montmeló, España',
    date: '2026-05-31T13:00:00Z',
    round: 7, totalRounds: 22,
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
    name: 'GP Francia', date: '18 Mayo 2026',
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
