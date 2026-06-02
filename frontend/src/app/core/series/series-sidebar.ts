import type { SeriesId } from './series.types';
import { homePathForSeries, SERIES_CONFIG } from './series.config';

export const SERIES_SECTION_LABELS = [
  'Inicio',
  'Noticias',
  'Calendario',
  'Pilotos',
  'Escuderías',
  'Clasificación',
] as const;

/** Labels del menú moto (misma ruta que «Escuderías»). */
export const MOTO_SECTION_LABELS = [
  'Inicio',
  'Noticias',
  'Calendario',
  'Pilotos',
  'Equipos',
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

function normalizeSectionLabel(label: string): SeriesSectionLabel | null {
  if (label === 'Equipos') return 'Escuderías';
  if ((SERIES_SECTION_LABELS as readonly string[]).includes(label)) {
    return label as SeriesSectionLabel;
  }
  return null;
}

export function seriesSectionPath(seriesId: SeriesId, label: string): string | null {
  const key = normalizeSectionLabel(label);
  if (!key) return null;
  const fn = SECTION_PATHS[key];
  const cfg = SERIES_CONFIG[seriesId];
  const home = homePathForSeries(seriesId);
  const prefix = seriesId === 'f1' ? '/f1' : cfg.routePrefix;
  return fn(prefix, home);
}
