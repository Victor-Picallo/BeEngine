import type { SeriesId } from './series.types';

/** Rutas donde el sidebar/topbar muestran F1/F2/F3 en lugar de categorías globales. */
export function isFormulaAppRoute(url: string): boolean {
  const path = url.split('?')[0];
  if (path === '/inicio' || path === '/f2' || path === '/f3') return true;
  return /^\/f[123]\//.test(path);
}

/** Serie de fórmula inferida de la URL (`/`, `/f1/...`, `/f2/...`, `/f3/...`). */
export function formulaSeriesFromUrl(url: string): SeriesId {
  const path = url.split('?')[0];
  if (path.startsWith('/f2')) return 'f2';
  if (path.startsWith('/f3')) return 'f3';
  return 'f1';
}
