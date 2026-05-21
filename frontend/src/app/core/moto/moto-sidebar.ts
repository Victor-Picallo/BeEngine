import { MOTO_HOME_PATH } from './moto-categories';
import type { MotoCategoryId } from './moto-categories';

export const MOTO_SECTION_LABELS = [
  'Inicio',
  'Noticias',
  'Calendario',
  'Pilotos',
  'Escuderías',
  'Clasificación',
] as const;

export type MotoSectionLabel = (typeof MOTO_SECTION_LABELS)[number];

const MOTO_PREFIX = MOTO_HOME_PATH;

export function motoSectionPath(cat: MotoCategoryId, label: string): string | null {
  switch (label as MotoSectionLabel) {
    case 'Inicio':
      return MOTO_PREFIX;
    case 'Noticias':
      return `${MOTO_PREFIX}/noticias${cat !== 'motogp' ? `?cat=${cat}` : ''}`;
    case 'Calendario':
      return `${MOTO_PREFIX}/calendario`;
    case 'Pilotos':
      return `${MOTO_PREFIX}/pilotos`;
    case 'Escuderías':
      return `${MOTO_PREFIX}/escuderias`;
    case 'Clasificación':
      return `${MOTO_PREFIX}/clasificacion`;
    default:
      return null;
  }
}
