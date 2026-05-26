export type DataSource = 'live' | 'db' | 'empty';

/** Prioriza `db` si cualquier endpoint respondió desde base de datos. */
export function mergeDataSources(
  ...sources: (DataSource | null | undefined)[]
): DataSource | null {
  const s = sources.filter((x): x is DataSource => x === 'live' || x === 'db' || x === 'empty');
  if (!s.length) return null;
  if (s.includes('db')) return 'db';
  if (s.every((x) => x === 'empty')) return 'empty';
  if (s.includes('live')) return 'live';
  return s[0] ?? null;
}
