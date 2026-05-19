import { seriesSectionPath } from '../core/series/series-sidebar';
import { SERIES_SECTION_LABELS } from '../core/series/series-sidebar';

/** @deprecated Usar SERIES_SECTION_LABELS; se mantiene por compatibilidad. */
export const F1_SIDEBAR_SECTION_LABELS = SERIES_SECTION_LABELS;

/** Rutas del sidebar para F1. */
export function f1SidebarSectionPath(label: string): string | null {
  return seriesSectionPath('f1', label);
}

export { seriesSectionPath, SERIES_SECTION_LABELS };
