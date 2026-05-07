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

export const FLAG_MAP: Record<string, string> = {
  NL: '🇳🇱', GB: '🇬🇧', MC: '🇲🇨', ES: '🇪🇸', AU: '🇦🇺', IT: '🇮🇹', ZA: '🇿🇦',
};
