export interface Category {
  id: string;
  label: string;
  short: string;
  accent: string;
}

// Series shown inside the sidebar's "Categorías" section, keyed by the
// top-level topbar category. The first entry is the parent series.
export const SUB_CATEGORIES: Record<string, Category[]> = {
  f1: [
    { id: 'f1', label: 'Formula 1', short: 'F1', accent: '#FFD100' },
    { id: 'f2', label: 'Formula 2', short: 'F2', accent: '#0090FF' },
    { id: 'f3', label: 'Formula 3', short: 'F3', accent: '#9E9E9E' },
  ],
  motogp: [
    { id: 'motogp', label: 'MotoGP', short: 'MotoGP', accent: '#0052CC' },
    { id: 'moto2',  label: 'Moto 2', short: 'Moto2',  accent: '#FF6B35' },
    { id: 'moto3',  label: 'Moto 3', short: 'Moto3',  accent: '#52C41A' },
  ],
};

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
  /** Jolpica/Ergast id para ficha en /f1/pilotos/:driverId */
  driverId?: string;
}

export interface Constructor {
  pos: number;
  team: string;
  points: number;
  color: string;
  /** Jolpica id o slug BeEngine (audi, cadillac…) para /f1/escuderias/:constructorId */
  constructorId?: string;
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
  /** Slug de ruta `/f1/calendario/:slug/race` (derivado del nombre del GP). */
  slug?: string;
  /** Foto de podio / victoria (RSS o Wikipedia). */
  imageUrl?: string | null;
  winnerName?: string;
}

export interface NewsItem {
  tag: string;
  title: string;
  time: string;
  hot?: boolean;
  id?: string;
  imageUrl?: string | null;
  cat?: string;
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
  driverId?: string;
}

export function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

export const FLAG_MAP: Record<string, string> = {
  NL: '🇳🇱', GB: '🇬🇧', MC: '🇲🇨', ES: '🇪🇸', AU: '🇦🇺', IT: '🇮🇹', ZA: '🇿🇦',
};
