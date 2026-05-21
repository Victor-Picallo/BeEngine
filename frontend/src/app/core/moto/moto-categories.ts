import { SUB_CATEGORIES, type Category } from '../../data/sports.data';

export const MOTO_CATEGORY_IDS = ['motogp', 'moto2', 'moto3'] as const;
export type MotoCategoryId = (typeof MOTO_CATEGORY_IDS)[number];

export const MOTO_SIDEBAR_CATEGORIES: Category[] = SUB_CATEGORIES['motogp'];

export const MOTO_HOME_PATH = '/motogp';

export function isMotoCategory(id: string): id is MotoCategoryId {
  return (MOTO_CATEGORY_IDS as readonly string[]).includes(id);
}

/** Rutas de la sección MotoGP (`/motogp`, noticias bajo el mismo prefijo). */
export function isMotoAppRoute(url: string): boolean {
  const path = url.split('?')[0];
  return path === MOTO_HOME_PATH || path.startsWith(`${MOTO_HOME_PATH}/`);
}

/** Noticias moto en `/motogp/noticias` o legado `/noticias?cat=moto*`. */
export function isMotoNewsRoute(path: string, cat: string | null | undefined): boolean {
  if (isMotoAppRoute(path) && path.includes('/noticias')) return true;
  if (!path.split('?')[0].startsWith('/noticias')) return false;
  return cat != null && isMotoCategory(cat);
}

export function motoCategoryFromUrl(url: string): MotoCategoryId {
  const [path, query = ''] = url.split('?');
  const cat = new URLSearchParams(query).get('cat');
  if (cat && isMotoCategory(cat)) return cat;
  return 'motogp';
}
