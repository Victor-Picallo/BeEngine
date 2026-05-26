/** Tipos Pulse Live Moto3. */

export interface Moto3TeamStanding {
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

export interface Moto3TeamProfileDriver {
  driverId: string;
  givenName: string;
  familyName: string;
  code: string;
  number: number | null;
  nationality: string;
  headshotUrl?: string | null;
}

export interface Moto3TeamProfileStanding {
  pos: number;
  points: number;
  wins: number;
}

export interface Moto3TeamProfileRaceRow {
  round: number;
  gp: string;
  d1Pos: number | null;
  d2Pos: number | null;
  pts: number;
  pos: number;
  points: number;
  cumPts: number;
}

export interface Moto3TeamProfileCareerRow {
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

export interface Moto3TeamProfileCareerPagination {
  page: number;
  pageSize: number;
  totalYears: number;
  totalPages: number;
  maxPts: number;
}

export interface Moto3TeamProfile {
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
  standing: Moto3TeamProfileStanding | null;
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
  drivers: Moto3TeamProfileDriver[];
  currentSeason: Moto3TeamProfileRaceRow[];
  careerHistory: Moto3TeamProfileCareerRow[];
  bioText: string;
  statsSource?: string;
  historyScope?: 'manufacturer' | 'team';
  careerHistoryPagination?: Moto3TeamProfileCareerPagination | null;
  careerHistoryError?: string | null;
}
