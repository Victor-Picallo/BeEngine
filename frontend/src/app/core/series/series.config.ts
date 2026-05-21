import type { SeriesConfig, SeriesId } from './series.types';

export const SERIES_CONFIG: Record<SeriesId, SeriesConfig> = {
  f1: {
    id: 'f1',
    label: 'Formula 1',
    short: 'F1',
    accent: '#FFD100',
    routePrefix: '/f1',
    features: {
      openF1: true,
      livePage: true,
      raceSessionPage: true,
      driverProfiles: 'full',
    },
  },
  f2: {
    id: 'f2',
    label: 'Formula 2',
    short: 'F2',
    accent: '#0090FF',
    routePrefix: '/f2',
    features: {
      openF1: false,
      livePage: false,
      raceSessionPage: false,
      driverProfiles: 'basic',
    },
  },
  f3: {
    id: 'f3',
    label: 'Formula 3',
    short: 'F3',
    accent: '#9E9E9E',
    routePrefix: '/f3',
    features: {
      openF1: false,
      livePage: false,
      raceSessionPage: false,
      driverProfiles: 'basic',
    },
  },
};

export const FORMULA_SERIES_IDS: SeriesId[] = ['f1', 'f2', 'f3'];

export function seriesFromUrl(url: string): SeriesId {
  if (url.startsWith('/f2')) return 'f2';
  if (url.startsWith('/f3')) return 'f3';
  return 'f1';
}

export function homePathForSeries(id: SeriesId): string {
  return id === 'f1' ? '/' : `/${id}`;
}

/** Listado de noticias de la serie (`/f1/noticias`, `/f2/noticias`, …). */
export function newsPathForSeries(id: SeriesId): string {
  return id === 'f1' ? '/f1/noticias' : `/${id}/noticias`;
}

/** F2 y F3 comparten UI de feeder (sin OpenF1, perfiles básicos). */
export function isFeederSeries(id: SeriesId): boolean {
  return id === 'f2' || id === 'f3';
}
