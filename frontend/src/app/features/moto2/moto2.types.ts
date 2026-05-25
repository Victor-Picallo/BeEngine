/** Tipos Pulse Live Moto2. */

export interface Moto2TeamStanding {
  pos: number;
  team: string;
  constructorId: string;
  teamId?: string | null;
  points: number;
  wins: number;
  nationality: string;
  logoUrl?: string | null;
  bikeImageUrl?: string | null;
  teamColor?: string | null;
}

export interface Moto2TeamProfileDriver {
  driverId: string;
  givenName: string;
  familyName: string;
  code: string;
  number: number | null;
  nationality: string;
  headshotUrl?: string | null;
}

export interface Moto2TeamProfileStanding {
  pos: number;
  points: number;
  wins: number;
}

export interface Moto2TeamProfileRaceRow {
  round: number;
  gp: string;
  d1Pos: number | null;
  d2Pos: number | null;
  pts: number;
  pos: number;
  points: number;
  cumPts: number;
}

export interface Moto2TeamProfileCareerRow {
  year: number;
  name: string;
  races: number | null;
  wins: number;
  podiums: number;
  poles: number;
  pts: number;
  pos: number | null;
  seasonComplete: boolean;
  titleWon: boolean;
}

export interface Moto2TeamProfileCareerPagination {
  page: number;
  pageSize: number;
  totalYears: number;
  totalPages: number;
  maxPts: number;
}

export interface Moto2TeamProfile {
  source: string;
  constructorId: string;
  teamId?: string | null;
  name: string;
  nationality: string;
  wikiUrl: string | null;
  logoUrl?: string | null;
  bikeImageUrl?: string | null;
  teamColor?: string | null;
  currentSeasonYear: number;
  standing: Moto2TeamProfileStanding | null;
  stats: {
    championships: number;
    championshipYears?: number[];
    totalWins: number;
    totalPodiums: number;
    totalPoles: number;
  };
  linkedManufacturer?: {
    slug: string;
    name: string;
    championships: number;
    championshipYears: number[];
    totalWins: number;
  } | null;
  aggregatesPending?: boolean;
  aggregatesError?: boolean;
  drivers: Moto2TeamProfileDriver[];
  currentSeason: Moto2TeamProfileRaceRow[];
  careerHistory: Moto2TeamProfileCareerRow[];
  bioText: string;
  statsSource?: string;
  historyScope?: 'manufacturer' | 'team';
  careerHistoryPagination?: Moto2TeamProfileCareerPagination | null;
  careerHistoryError?: string | null;
}
