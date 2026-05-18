/** Temporadas por página cuando el historial supera este umbral. */
export const CAREER_HISTORY_PAGE_SIZE = 10;

/**
 * Pagina filas de historial por año (ascendente). Página 1 = bloque más reciente.
 * @template T
 * @param {T[]} rows Debe incluir `year` y un campo numérico `pts` (o `getPts`).
 * @param {number} page 1-based
 * @param {(row: T) => number} [getPts]
 */
export function paginateCareerHistoryByRecentPage(rows, page, getPts = (r) => Number(r.pts) || 0) {
  const sorted = [...rows].sort((a, b) => a.year - b.year);
  const n = sorted.length;
  const pageSize = CAREER_HISTORY_PAGE_SIZE;
  const maxPts = n ? Math.max(1, ...sorted.map(getPts)) : 1;

  if (n <= pageSize) {
    return {
      items: sorted,
      careerHistoryPagination: null,
    };
  }

  const totalPages = Math.ceil(n / pageSize);
  const p = Math.min(Math.max(1, parseInt(String(page), 10) || 1), totalPages);
  const start = Math.max(0, n - p * pageSize);
  const end = n - (p - 1) * pageSize;
  return {
    items: sorted.slice(start, end),
    careerHistoryPagination: {
      page: p,
      pageSize,
      totalYears: n,
      totalPages,
      maxPts,
    },
  };
}
