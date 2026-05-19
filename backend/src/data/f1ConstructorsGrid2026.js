/**
 * Parrilla F1 2026 curada en BeEngine.
 * Las cards de /f1/escuderias usan esto como base; puntos/posición se superponen
 * desde caché de Jolpica cuando hay datos recientes.
 */

/** @typedef {{ constructorId: string, team: string, nationality: string, gridOrder: number }} ConstructorGridEntry */

/** @type {ConstructorGridEntry[]} */
export const F1_CONSTRUCTORS_GRID_2026 = [
  { constructorId: 'mclaren', team: 'McLaren', nationality: 'British', gridOrder: 1 },
  { constructorId: 'ferrari', team: 'Ferrari', nationality: 'Italian', gridOrder: 2 },
  { constructorId: 'mercedes', team: 'Mercedes', nationality: 'German', gridOrder: 3 },
  { constructorId: 'red_bull', team: 'Red Bull Racing', nationality: 'Austrian', gridOrder: 4 },
  { constructorId: 'williams', team: 'Williams', nationality: 'British', gridOrder: 5 },
  { constructorId: 'rb', team: 'Racing Bulls', nationality: 'Italian', gridOrder: 6 },
  { constructorId: 'aston_martin', team: 'Aston Martin', nationality: 'British', gridOrder: 7 },
  { constructorId: 'haas', team: 'Haas F1 Team', nationality: 'American', gridOrder: 8 },
  { constructorId: 'audi', team: 'Audi Revolut F1 Team', nationality: 'Swiss', gridOrder: 9 },
  { constructorId: 'cadillac', team: 'Cadillac F1 Team', nationality: 'American', gridOrder: 10 },
  { constructorId: 'alpine', team: 'Alpine F1 Team', nationality: 'French', gridOrder: 11 },
];

const GRID_BY_ID = new Map(
  F1_CONSTRUCTORS_GRID_2026.map((e) => [e.constructorId.toLowerCase(), e]),
);

export function getConstructorGridEntry(constructorId) {
  return GRID_BY_ID.get(String(constructorId || '').trim().toLowerCase()) ?? null;
}
