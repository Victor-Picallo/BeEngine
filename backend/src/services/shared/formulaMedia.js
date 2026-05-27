/** Medios de fórmula: solo URLs persistidas en Postgres / Supabase. */
export function resolveFormulaMediaUrl(_seriesId, _entityId, _kind, dbUrl) {
  const url = (dbUrl ?? '').trim();
  return url || null;
}
