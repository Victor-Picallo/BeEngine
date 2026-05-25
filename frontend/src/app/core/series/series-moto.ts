import { SUB_CATEGORIES, type Category } from '../../data/sports.data';
import type { MotoPulseSeriesId, SeriesId } from './series.types';

/** Series moto con UI propia (GP, Moto2, …). Moto3 se mantiene en tipos/API. */
export const MOTO_UI_SERIES_IDS = ['motogp', 'moto2'] as const;
export type MotoUiSeriesId = (typeof MOTO_UI_SERIES_IDS)[number];

export const MOTO_PULSE_SERIES_IDS: MotoPulseSeriesId[] = ['motogp', 'moto2', 'moto3'];

export const MOTO_SIDEBAR_CATEGORIES: Category[] = SUB_CATEGORIES['motogp'];

export function isMotoUiSeries(id: string): id is MotoUiSeriesId {
  return (MOTO_UI_SERIES_IDS as readonly string[]).includes(id);
}

/** @deprecated Usar `isMotoUiSeries` — alias para noticias/header. */
export function isMotoCategory(id: string): id is MotoPulseSeriesId {
  return (MOTO_PULSE_SERIES_IDS as readonly string[]).includes(id);
}

export function isMotoAppRoute(url: string): boolean {
  const path = url.split('?')[0];
  return MOTO_PULSE_SERIES_IDS.some(
    (id) => path === `/${id}` || path.startsWith(`/${id}/`),
  );
}

export function isMotoNewsRoute(path: string, cat: string | null | undefined): boolean {
  if (isMotoAppRoute(path) && path.includes('/noticias')) return true;
  if (!path.split('?')[0].startsWith('/noticias')) return false;
  return cat != null && isMotoCategory(cat);
}

export function motoSeriesFromUrl(url: string): MotoPulseSeriesId {
  const [path, query = ''] = url.split('?');
  const cat = new URLSearchParams(query).get('cat');
  if (cat && isMotoCategory(cat)) return cat;
  const firstSeg = path.split('/')[1];
  if (firstSeg && isMotoCategory(firstSeg)) return firstSeg;
  return 'motogp';
}

export function isMotoSeriesId(id: SeriesId): boolean {
  return id === 'motogp' || id === 'moto2' || id === 'moto3';
}
