export type SeriesId = 'f1' | 'f2' | 'f3' | 'motogp' | 'moto2' | 'moto3';

/** Series de moto con API Pulse Live bajo /{id}/pulselive. */
export type MotoPulseSeriesId = 'motogp' | 'moto2' | 'moto3';

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
