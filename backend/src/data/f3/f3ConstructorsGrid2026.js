/**
 * Equipos F3 2026 — datos curados BeEngine.
 * @typedef {{ constructorId: string, team: string, nationality: string, gridOrder: number }} F3ConstructorGridEntry
 */

/** @type {F3ConstructorGridEntry[]} */
export const F3_CONSTRUCTORS_GRID_2026 = [
  { constructorId: 'van_amersfoort', team: 'Van Amersfoort Racing', nationality: 'Dutch', gridOrder: 1 },
  { constructorId: 'campos', team: 'Campos Racing', nationality: 'Spanish', gridOrder: 2 },
  { constructorId: 'art', team: 'ART Grand Prix', nationality: 'French', gridOrder: 3 },
  { constructorId: 'trident', team: 'Trident', nationality: 'Italian', gridOrder: 4 },
  { constructorId: 'rodin', team: 'Rodin Motorsport', nationality: 'Swiss', gridOrder: 5 },
  { constructorId: 'aix', team: 'AIX Racing', nationality: 'German', gridOrder: 6 },
  { constructorId: 'hitech', team: 'Hitech', nationality: 'British', gridOrder: 7 },
  { constructorId: 'mp_motorsport', team: 'MP Motorsport', nationality: 'Dutch', gridOrder: 8 },
  { constructorId: 'prema', team: 'Prema Racing', nationality: 'Italian', gridOrder: 9 },
  { constructorId: 'dams', team: 'DAMS Lucas Oil', nationality: 'French', gridOrder: 10 },
];

const GRID_BY_ID = new Map(
  F3_CONSTRUCTORS_GRID_2026.map((e) => [e.constructorId.toLowerCase(), e]),
);

export function getF3ConstructorGridEntry(constructorId) {
  return GRID_BY_ID.get(String(constructorId || '').trim().toLowerCase()) ?? null;
}

export const F3_CONSTRUCTOR_POINTS_2026 = {
  van_amersfoort: 30,
  campos: 27,
  art: 26,
  trident: 20,
  rodin: 7,
  aix: 6,
  hitech: 2,
  mp_motorsport: 1,
  prema: 0,
  dams: 0,
};
