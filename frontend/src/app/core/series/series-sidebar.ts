import type { SeriesId } from './series.types';
import { SERIES_CONFIG } from './series.config';

export const SERIES_SECTION_LABELS = [
  'Inicio',
  'Noticias',
  'Calendario',
  'Pilotos',
  'Escuderías',
  'Clasificación',
] as const;

export type SeriesSectionLabel = (typeof SERIES_SECTION_LABELS)[number];

const SECTION_PATHS: Record<SeriesSectionLabel, (prefix: string, home: string) => string | null> = {
  Inicio: (_p, home) => home,
  Noticias: (p) => `${p}/noticias`,
  Calendario: (p) => `${p}/calendario`,
  Pilotos: (p) => `${p}/pilotos`,
  Escuderías: (p) => `${p}/escuderias`,
  Clasificación: (p) => `${p}/clasificacion`,
};

export function seriesSectionPath(seriesId: SeriesId, label: string): string | null {
  const key = label as SeriesSectionLabel;
  const fn = SECTION_PATHS[key];
  if (!fn) return null;
  const cfg = SERIES_CONFIG[seriesId];
  const home = seriesId === 'f1' ? '/' : cfg.routePrefix;
  const prefix = seriesId === 'f1' ? '/f1' : cfg.routePrefix;
  return fn(prefix, home);
}
