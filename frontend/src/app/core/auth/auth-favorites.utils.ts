import type { Favorite } from '../../data/sports.data';
import { SERIES_CONFIG } from '../series/series.config';
import type { SeriesId } from '../series/series.types';
import type { UserFavoriteDto } from './auth.types';

export interface SidebarFavoriteRow {
  key: string;
  kind: 'category' | 'driver';
  seriesId: SeriesId;
  title: string;
  subtitle: string;
  driverId?: string;
  accent: string;
  badge: string;
  /** Logo de categoría (fijo) o retrato de piloto (relleno tras cargar standings). */
  thumbUrl: string;
}

/** Filas para el sidebar (categoría + piloto, orden del API). */
export function sidebarFavoriteRowsFromProfile(favorites: UserFavoriteDto[]): SidebarFavoriteRow[] {
  const rows: SidebarFavoriteRow[] = [];
  for (const f of favorites) {
    const sid = f.seriesId as SeriesId;
    const cfg = SERIES_CONFIG[sid];
    const accent = cfg?.accent ?? '#888';
    const badge = cfg?.short ?? sid.toUpperCase();

    if (f.kind === 'category') {
      rows.push({
        key: `cat-${sid}`,
        kind: 'category',
        seriesId: sid,
        title: f.label?.trim() || cfg?.label || sid,
        subtitle: 'Categoría favorita',
        accent,
        badge,
        thumbUrl: '',
      });
      continue;
    }

    if (f.kind === 'driver' && f.driverId) {
      rows.push({
        key: `drv-${sid}-${f.driverId}`,
        kind: 'driver',
        seriesId: sid,
        title: f.label?.trim() || f.driverId,
        subtitle: f.teamLabel?.trim() || cfg?.label || '',
        driverId: f.driverId,
        accent,
        badge,
        thumbUrl: '',
      });
    }
  }
  return rows;
}

/** @deprecated Usar sidebarFavoriteRowsFromProfile */
export function sidebarFavoritesFromProfile(favorites: UserFavoriteDto[]): Favorite[] {
  return favorites
    .filter((f) => f.kind === 'driver' && f.driverId)
    .map((f) => ({
      name: f.label?.trim() || f.driverId!,
      sub: f.teamLabel?.trim() || '',
      driverId: f.driverId!,
    }));
}
