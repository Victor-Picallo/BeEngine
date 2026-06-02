import type { SeriesId } from '../series/series.types';

const PREFIX_TO_SCOPE: [string, SeriesId | 'global'][] = [
  ['/f1', 'f1'],
  ['/f2', 'f2'],
  ['/f3', 'f3'],
  ['/motogp', 'motogp'],
  ['/moto2', 'moto2'],
  ['/moto3', 'moto3'],
];

/** Scope para snapshots según la ruta actual. */
export function assistScopeFromUrl(url: string): string {
  const path = (url.split('?')[0] ?? '/').toLowerCase();
  if (path === '/inicio') return 'global';
  if (path === '/' || path === '') return 'global';
  for (const [prefix, scope] of PREFIX_TO_SCOPE) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return scope;
  }
  return 'global';
}
