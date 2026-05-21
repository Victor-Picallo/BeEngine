export type SeriesId = 'f1' | 'f2' | 'f3' | 'motogp';

export interface SeriesFeatures {
  openF1: boolean;
  livePage: boolean;
  raceSessionPage: boolean;
  driverProfiles: 'full' | 'basic';
}

export interface SeriesConfig {
  id: SeriesId;
  label: string;
  short: string;
  accent: string;
  routePrefix: string;
  features: SeriesFeatures;
}
