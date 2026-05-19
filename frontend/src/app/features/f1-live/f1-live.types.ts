export interface OpenF1Driver {
  driverNumber: number;
  broadcastName: string;
  fullName: string;
  nameAcronym: string;
  teamName: string;
  teamColour: string;
  countryCode: string | null;
  headshotUrl: string;
}

export interface OpenF1Position {
  date: string;
  driverNumber: number;
  position: number;
  sessionKey: number;
  meetingKey: number;
}

export interface OpenF1Weather {
  airTemperature: number;
  trackTemperature: number;
  humidity: number;
  pressure: number;
  rainfall: number;
  windDirection: number;
  windSpeed: number;
  date: string;
  sessionKey: number;
  meetingKey: number;
}

export interface OpenF1Session {
  sessionKey: number;
  meetingKey: number;
  sessionName: string;
  sessionType: string;
  countryName: string;
  /** City / venue label from OpenF1 (e.g. "Miami Gardens" — may differ from Ergast locality "Miami"). */
  location: string;
  /** OpenF1 short label (e.g. "Miami") — stable for tying a Jolpika weekend to sessions. */
  circuitShortName?: string;
  dateStart: string;
  dateEnd: string;
  year: number;
}

export interface OpenF1Lap {
  dateStart: string;
  driverNumber: number;
  durationSector1: number | null;
  durationSector2: number | null;
  durationSector3: number | null;
  i1Speed: number | null;
  i2Speed: number | null;
  stSpeed: number | null;
  lapDuration: number | null;
  lapNumber: number;
  sessionKey: number;
  meetingKey: number;
}

export interface OpenF1Interval {
  date: string;
  driverNumber: number;
  // OpenF1 returns these as a number (seconds) for cars on the lead lap, or
  // a string like "1 LAP" / "+1 LAP" for lapped cars.
  gapToLeader: number | string | null;
  interval: number | string | null;
  sessionKey: number;
  meetingKey: number;
}

export interface OpenF1Stint {
  driverNumber: number;
  compound: string;
  lapStart: number;
  lapEnd: number | null;
  stintNumber: number;
  tyreAgeAtStart: number;
  sessionKey: number;
  meetingKey: number;
}

export interface OpenF1RaceControl {
  date: string;
  category: string;
  message: string | null;
  driverNumber: number | null;
  flag: string | null;
  lapNumber: number | null;
  scope: string | null;
  sector: number | null;
  sessionKey: number;
  meetingKey: number;
}

export interface OpenF1TeamRadio {
  date: string;
  driverNumber: number;
  recordingUrl: string;
  sessionKey: number;
  meetingKey: number;
}

export interface OpenF1Location {
  x: number;
  y: number;
  z: number;
  date: string;
  driverNumber: number;
  sessionKey: number;
  meetingKey: number;
}

export interface JolpikaDriverStanding {
  pos: number;
  driver: string;
  /** Ergast / Jolpica driver id (e.g. max_verstappen). */
  driverId: string;
  team: string;
  points: number;
  wins: number;
  nationality: string;
}

export interface JolpikaCareerHistoryPagination {
  page: number;
  pageSize: number;
  totalYears: number;
  totalPages: number;
  /** Máximo de puntos en una temporada (historial completo) para escalar el gráfico entre páginas. */
  maxPts: number;
}

export interface JolpikaDriverProfileRaceRow {
  round: number;
  gp: string;
  grid: number;
  pos: number;
  pts: number;
  gap: string;
  laps: number;
  fl: boolean;
  teamName: string;
}

export interface JolpikaDriverProfileCareerRow {
  year: number;
  team: string;
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  pts: number;
  pos: number | null;
  /** Final championship table for that year (all rounds run). */
  seasonComplete: boolean;
  /** World champion that year (pos 1 when season complete). */
  titleWon: boolean;
}

export interface JolpikaDriverProfileAggregates {
  championships: number;
  stats: {
    wins: number;
    podiums: number;
    poles: number;
    fastestLaps: number;
    races: number;
    points: number;
    winsCurrentSeason: number;
  };
  debut: string;
  maxCareerPts: number;
  /** Aún calculando el histórico completo en segundo plano. */
  partial?: boolean;
}

export interface JolpikaDriverProfile {
  source: string;
  driverId: string;
  givenName: string;
  familyName: string;
  code: string;
  number: number | null;
  dateOfBirth: string | null;
  nationality: string;
  championships: number;
  debut: string;
  currentSeasonYear: number;
  stats: {
    wins: number;
    podiums: number;
    poles: number;
    fastestLaps: number;
    races: number;
    points: number;
    winsCurrentSeason: number;
  };
  currentSeason: JolpikaDriverProfileRaceRow[];
  careerHistory: JolpikaDriverProfileCareerRow[];
  careerHistoryPagination: JolpikaCareerHistoryPagination | null;
  aggregatesPending?: boolean;
  /** local | live (baseline + temporada actual) | api (agregados Jolpica completos). */
  statsSource?: 'local' | 'live' | 'api';
  aggregatesError?: boolean;
}

export interface JolpikaConstructorStanding {
  pos: number;
  team: string;
  /** Ergast / Jolpica constructor id (e.g. red_bull). */
  constructorId: string;
  points: number;
  wins: number;
  nationality: string;
}

export interface JolpikaConstructorProfileDriver {
  driverId: string;
  givenName: string;
  familyName: string;
  code: string;
  number: number | null;
  nationality: string;
}

export interface JolpikaConstructorProfileStanding {
  pos: number;
  points: number;
  wins: number;
}

export interface JolpikaConstructorProfileRaceRow {
  round: number;
  gp: string;
  d1Pos: number | null;
  d2Pos: number | null;
  points: number;
  cumPts: number;
}

export interface JolpikaConstructorProfileCareerRow {
  year: number;
  wins: number;
  podiums: number;
  poles: number;
  pts: number;
  pos: number;
  /** Ronda reflejada en la tabla de clasificación (Jolpica/Ergast). */
  standingsRound: number;
  /** Campeona de constructores solo si la temporada está cerrada (no la actual a mitad de año). */
  titleWon?: boolean;
}

export interface JolpikaConstructorProfileAggregates {
  stats: {
    championships: number;
    totalWins: number;
    totalPodiums: number;
    totalPoles: number;
  };
  bioText: string;
  maxCareerPts: number;
  /** Aún calculando el histórico completo en segundo plano. */
  partial?: boolean;
}

export interface JolpikaConstructorProfile {
  source: string;
  constructorId: string;
  name: string;
  nationality: string;
  wikiUrl: string | null;
  currentSeasonYear: number;
  standing: JolpikaConstructorProfileStanding | null;
  stats: {
    championships: number;
    totalWins: number;
    totalPodiums: number;
    totalPoles: number;
  };
  drivers: JolpikaConstructorProfileDriver[];
  currentSeason: JolpikaConstructorProfileRaceRow[];
  careerHistory: JolpikaConstructorProfileCareerRow[];
  bioText: string;
  careerHistoryPagination: JolpikaCareerHistoryPagination | null;
  aggregatesPending?: boolean;
  /** local | live (baseline + 2026) | api (agregados Jolpica completos). */
  statsSource?: 'local' | 'live' | 'api';
  aggregatesError?: boolean;
  /** Jolpica no devolvió filas para la página pedida (p. ej. rate limit). */
  careerHistoryError?: boolean;
}

export interface JolpikaCalendarRace {
  round: number;
  raceName: string;
  circuitName: string;
  locality: string;
  country: string;
  date: string;
  time: string | null;
}

export interface JolpikaLastRaceResult {
  position: number;
  driver: string;
  team: string;
  grid: number;
  laps: number;
  status: string;
  points: number;
  time: string | null;
}

export interface JolpikaLastRace {
  source: string;
  round: number;
  raceName: string;
  circuitName: string;
  date: string;
  results: JolpikaLastRaceResult[];
}

export type JolpikaRaceResult = JolpikaLastRace;

export type TireType = 's' | 'm' | 'h' | 'i' | 'w';
export type SectorColor = 'sec-purple' | 'sec-yellow' | 'sec-green' | 'sec-white';

export interface TimingDriver {
  pos: number;
  num: number;
  name: string;
  short: string;
  team: string;
  teamColor: string;
  gap: string;
  interval: string;
  lastLap: string;
  bestLap: string;
  tire: TireType;
  tyreAge: number;
  laps: number;
  drs: boolean;
  s1: string;
  s2: string;
  s3: string;
  s1c: SectorColor;
  s2c: SectorColor;
  s3c: SectorColor;
  speed: number;
}

export interface RadioMessage {
  time: string;
  type: 'radio' | 'control';
  from: string;
  msg: string;
  urgent?: boolean;
}

export interface DriverStandingDisplay {
  pos: number;
  short: string;
  name: string;
  points: number;
  teamColor: string;
}

export interface ConstructorStandingDisplay {
  pos: number;
  name: string;
  points: number;
  color: string;
}
