/** Pestañas visibles en el header global (solo F1 y MotoGP). */
export const TOPBAR_CATEGORIES = [
  { id: 'f1', label: 'Formula 1', short: 'F1', accent: '#FFD100' },
  { id: 'motogp', label: 'MotoGP', short: 'MotoGP', accent: '#0052CC' },
];

/** Todas las categorías con datos / noticias en backend. */
export const CATEGORIES = [
  ...TOPBAR_CATEGORIES,
  { id: 'moto2', label: 'Moto 2', short: 'Moto2', accent: '#FF6B35' },
  { id: 'moto3', label: 'Moto 3', short: 'Moto3', accent: '#52C41A' },
  { id: 'f2', label: 'Formula 2', short: 'F2', accent: '#0090FF' },
  { id: 'f3', label: 'Formula 3', short: 'F3', accent: '#9E9E9E' },
];

export const VALID_CATEGORIES = CATEGORIES.map((c) => c.id);
