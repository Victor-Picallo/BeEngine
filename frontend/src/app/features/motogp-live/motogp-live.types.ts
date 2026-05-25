export interface MotogpLiveTimingHead {
  circuitName: string;
  eventName: string;
  sessionShortName: string;
  sessionStatus: string;
  sessionStatusId?: string;
  remaining?: string | null;
  totalLaps: number;
  dateFormatted: string;
}

export interface MotogpLiveTimingRider {
  position: number;
  riderNumber: number;
  riderId: string;
  driver: string;
  shortName: string;
  team: string;
  teamColor: string;
  gap: string;
  interval: string;
  lastLap: string;
  bestLap: string;
  laps: number;
  onPit: boolean;
  bikeName?: string;
  bike?: string;
  trackStatus?: string | null;
  riderStatus?: string | null;
  s1?: string;
  s2?: string;
  s3?: string;
  s1c?: string;
  s2c?: string;
  s3c?: string;
}

export interface MotogpLiveTimingPayload {
  active: boolean;
  categoryId: string;
  head: MotogpLiveTimingHead | null;
  riders: MotogpLiveTimingRider[];
}

export interface MotogpRaceMessage {
  date: string;
  category: string;
  message: string;
  flag: string | null;
  urgent?: boolean;
}

export interface MotogpLiveFeedPayload {
  source: string;
  categoryId?: string;
  round: number;
  sessionKey: string;
  sessionResults?: import('../f1-live/f1-live.types').JolpikaRaceResult | null;
  timing: MotogpLiveTimingPayload;
  weather: {
    airTemperature: number;
    trackTemperature: number;
    humidity: number;
    pressure: number;
    rainfall: number;
    windDirection: number;
    windSpeed: number;
    conditionLabel?: string | null;
    trackCondition?: string | null;
    date: string;
    sessionKey: number | string;
    meetingKey: number;
  } | null;
  weatherSource?: string;
  sectorsSource?: string;
  messages: MotogpRaceMessage[];
  eventName: string | null;
  circuitName: string | null;
}
