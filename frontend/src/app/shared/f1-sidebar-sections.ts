/**
 * Etiquetas del bloque “Secciones” en páginas F1 (sidebar clara).
 * Sin “Vídeos”. “Escuderías” va justo después de “Pilotos”.
 */
export const F1_SIDEBAR_SECTION_LABELS: readonly string[] = [
  'Inicio',
  'Noticias',
  'Calendario',
  'Pilotos',
  'Escuderías',
  'Estadísticas',
];

const SECTION_PATH: Readonly<Record<string, string>> = {
  Inicio: '/',
  Noticias: '/noticias',
  Calendario: '/f1/calendario',
  Pilotos: '/f1/pilotos',
  /** Con o sin tilde en el literal del array */
  Escuderías: '/f1/escuderias',
  Escuderias: '/f1/escuderias',
};

/** Si no hay ruta, la sección se muestra como botón inactivo (p. ej. Noticias). */
export function f1SidebarSectionPath(label: string): string | null {
  return SECTION_PATH[label] ?? null;
}
