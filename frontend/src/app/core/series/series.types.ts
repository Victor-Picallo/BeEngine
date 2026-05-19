export type SeriesId = 'f1' | 'f2' | 'f3';

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
  routePrefix: `/${SeriesId}`;
  features: SeriesFeatures;
}
