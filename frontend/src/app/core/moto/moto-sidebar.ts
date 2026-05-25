import type { MotoCategoryId } from './moto-categories';

export const MOTO_SECTION_LABELS = [
  'Inicio',
  'Noticias',
  'Calendario',
  'Pilotos',
  'Equipos',
  'Clasificación',
] as const;

export type MotoSectionLabel = (typeof MOTO_SECTION_LABELS)[number];

export function motoSectionPath(cat: MotoCategoryId, label: string): string | null {
  const prefix = `/${cat}`;
  switch (label as MotoSectionLabel) {
    case 'Inicio':
      return prefix;
    case 'Noticias':
      return `${prefix}/noticias`;
    case 'Calendario':
      return `${prefix}/calendario`;
    case 'Pilotos':
      return `${prefix}/pilotos`;
    case 'Equipos':
      return `${prefix}/escuderias`;
    case 'Clasificación':
      return `${prefix}/clasificacion`;
    default:
      return null;
  }
}
