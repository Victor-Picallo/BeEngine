import type { MotoPulseSeriesId, SeriesConfig, SeriesId } from './series.types';

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
  motogp: {
    id: 'motogp',
    label: 'MotoGP',
    short: 'MotoGP',
    accent: '#0052CC',
    routePrefix: '/motogp',
    features: {
      openF1: false,
      livePage: true,
      raceSessionPage: true,
      driverProfiles: 'full',
    },
  },
  moto2: {
    id: 'moto2',
    label: 'Moto 2',
    short: 'Moto2',
    accent: '#FF6B35',
    routePrefix: '/moto2',
    features: {
      openF1: false,
      livePage: false,
      raceSessionPage: false,
      driverProfiles: 'full',
    },
  },
  moto3: {
    id: 'moto3',
    label: 'Moto 3',
    short: 'Moto3',
    accent: '#52C41A',
    routePrefix: '/moto3',
    features: {
      openF1: false,
      livePage: false,
      raceSessionPage: false,
      driverProfiles: 'full',
    },
  },
};

export const FORMULA_SERIES_IDS: SeriesId[] = ['f1', 'f2', 'f3'];

/** Series con UI de fórmula bajo su prefijo (incl. MotoGP principal). */
export const RACING_SERIES_IDS: SeriesId[] = ['f1', 'f2', 'f3', 'motogp'];

export function seriesFromUrl(url: string): SeriesId {
  if (url.startsWith('/motogp')) return 'motogp';
  if (url.startsWith('/moto2')) return 'moto2';
  if (url.startsWith('/moto3')) return 'moto3';
  if (url.startsWith('/f2')) return 'f2';
  if (url.startsWith('/f3')) return 'f3';
  return 'f1';
}

export function homePathForSeries(id: SeriesId): string {
  if (id === 'f1') return '/';
  return `/${id}`;
}

export function isMotoPulseSeries(id: SeriesId): id is MotoPulseSeriesId {
  return id === 'motogp' || id === 'moto2' || id === 'moto3';
}

/** Listado de noticias de la serie (`/f1/noticias`, `/f2/noticias`, …). */
export function newsPathForSeries(id: SeriesId): string {
  if (id === 'f1') return '/f1/noticias';
  return `/${id}/noticias`;
}

/** F2/F3/Moto2/Moto3: UI feeder; MotoGP usa live completo. */
export function isFeederSeries(id: SeriesId): boolean {
  return id === 'f2' || id === 'f3' || id === 'moto2' || id === 'moto3';
}

/** Solo F2/F3: `resultsAvailable` viene del calendario API (FIA) o del fallback local. */
export function isFormulaFeederSeries(id: SeriesId): boolean {
  return id === 'f2' || id === 'f3';
}

/** Moto2/Moto3: carrera vía feeder-race + Pulse (sin live-timing). */
export function isMotoFeederSeries(id: SeriesId): boolean {
  return id === 'moto2' || id === 'moto3';
}

export function isMotoSeries(id: SeriesId): boolean {
  return isMotoPulseSeries(id);
}
