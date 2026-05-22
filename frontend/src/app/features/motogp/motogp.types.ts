/** Tipos Pulse Live MotoGP (sin depender de la UI de F1). */

export interface MotogpTeamStanding {
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

export interface MotogpTeamProfileDriver {
  driverId: string;
  givenName: string;
  familyName: string;
  code: string;
  number: number | null;
  nationality: string;
  headshotUrl?: string | null;
}

export interface MotogpTeamProfileStanding {
  pos: number;
  points: number;
  wins: number;
}

export interface MotogpTeamProfileRaceRow {
  round: number;
  gp: string;
  d1Pos: number | null;
  d2Pos: number | null;
  pts: number;
  pos: number;
  points: number;
  cumPts: number;
}

export interface MotogpTeamProfileCareerRow {
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

export interface MotogpTeamProfileCareerPagination {
  page: number;
  pageSize: number;
  totalYears: number;
  totalPages: number;
  maxPts: number;
}

export interface MotogpTeamProfile {
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
  standing: MotogpTeamProfileStanding | null;
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
  drivers: MotogpTeamProfileDriver[];
  currentSeason: MotogpTeamProfileRaceRow[];
  careerHistory: MotogpTeamProfileCareerRow[];
  bioText: string;
  statsSource?: string;
  historyScope?: 'manufacturer' | 'team';
  careerHistoryPagination?: MotogpTeamProfileCareerPagination | null;
  careerHistoryError?: string | null;
}
