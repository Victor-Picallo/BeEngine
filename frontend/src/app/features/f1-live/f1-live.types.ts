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
  location: string;
  dateStart: string;
  dateEnd: string;
  year: number;
}

export interface JolpikaDriverStanding {
  pos: number;
  driver: string;
  team: string;
  points: number;
  wins: number;
  nationality: string;
}

export interface JolpikaConstructorStanding {
  pos: number;
  team: string;
  points: number;
  wins: number;
  nationality: string;
}

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
