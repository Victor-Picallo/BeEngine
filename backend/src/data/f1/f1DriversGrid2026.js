/**
 * Parrilla de pilotos F1 2026 (BeEngine).
 * El listado /f1/pilotos usa esto como base; puntos/posición desde caché Jolpica.
 */

/** @typedef {{ driverId: string, givenName: string, familyName: string, driver: string, team: string, nationality: string, gridOrder: number }} DriverGridEntry */

/** @type {DriverGridEntry[]} */
export const F1_DRIVERS_GRID_2026 = [
  { driverId: 'norris', givenName: 'Lando', familyName: 'Norris', driver: 'Lando Norris', team: 'McLaren', nationality: 'British', gridOrder: 1 },
  { driverId: 'piastri', givenName: 'Oscar', familyName: 'Piastri', driver: 'Oscar Piastri', team: 'McLaren', nationality: 'Australian', gridOrder: 2 },
  { driverId: 'leclerc', givenName: 'Charles', familyName: 'Leclerc', driver: 'Charles Leclerc', team: 'Ferrari', nationality: 'Monegasque', gridOrder: 3 },
  { driverId: 'hamilton', givenName: 'Lewis', familyName: 'Hamilton', driver: 'Lewis Hamilton', team: 'Ferrari', nationality: 'British', gridOrder: 4 },
  { driverId: 'russell', givenName: 'George', familyName: 'Russell', driver: 'George Russell', team: 'Mercedes', nationality: 'British', gridOrder: 5 },
  { driverId: 'antonelli', givenName: 'Andrea Kimi', familyName: 'Antonelli', driver: 'Andrea Kimi Antonelli', team: 'Mercedes', nationality: 'Italian', gridOrder: 6 },
  { driverId: 'max_verstappen', givenName: 'Max', familyName: 'Verstappen', driver: 'Max Verstappen', team: 'Red Bull Racing', nationality: 'Dutch', gridOrder: 7 },
  { driverId: 'hadjar', givenName: 'Isack', familyName: 'Hadjar', driver: 'Isack Hadjar', team: 'Red Bull Racing', nationality: 'French', gridOrder: 8 },
  { driverId: 'sainz', givenName: 'Carlos', familyName: 'Sainz', driver: 'Carlos Sainz', team: 'Williams', nationality: 'Spanish', gridOrder: 9 },
  { driverId: 'albon', givenName: 'Alexander', familyName: 'Albon', driver: 'Alexander Albon', team: 'Williams', nationality: 'Thai', gridOrder: 10 },
  { driverId: 'lawson', givenName: 'Liam', familyName: 'Lawson', driver: 'Liam Lawson', team: 'Racing Bulls', nationality: 'New Zealander', gridOrder: 11 },
  { driverId: 'arvid_lindblad', givenName: 'Arvid', familyName: 'Lindblad', driver: 'Arvid Lindblad', team: 'Racing Bulls', nationality: 'British', gridOrder: 12 },
  { driverId: 'alonso', givenName: 'Fernando', familyName: 'Alonso', driver: 'Fernando Alonso', team: 'Aston Martin', nationality: 'Spanish', gridOrder: 13 },
  { driverId: 'stroll', givenName: 'Lance', familyName: 'Stroll', driver: 'Lance Stroll', team: 'Aston Martin', nationality: 'Canadian', gridOrder: 14 },
  { driverId: 'ocon', givenName: 'Esteban', familyName: 'Ocon', driver: 'Esteban Ocon', team: 'Haas F1 Team', nationality: 'French', gridOrder: 15 },
  { driverId: 'bearman', givenName: 'Oliver', familyName: 'Bearman', driver: 'Oliver Bearman', team: 'Haas F1 Team', nationality: 'British', gridOrder: 16 },
  { driverId: 'bortoleto', givenName: 'Gabriel', familyName: 'Bortoleto', driver: 'Gabriel Bortoleto', team: 'Audi Revolut F1 Team', nationality: 'Brazilian', gridOrder: 17 },
  { driverId: 'hulkenberg', givenName: 'Nico', familyName: 'Hülkenberg', driver: 'Nico Hülkenberg', team: 'Audi Revolut F1 Team', nationality: 'German', gridOrder: 18 },
  { driverId: 'perez', givenName: 'Sergio', familyName: 'Pérez', driver: 'Sergio Pérez', team: 'Cadillac F1 Team', nationality: 'Mexican', gridOrder: 19 },
  { driverId: 'bottas', givenName: 'Valtteri', familyName: 'Bottas', driver: 'Valtteri Bottas', team: 'Cadillac F1 Team', nationality: 'Finnish', gridOrder: 20 },
  { driverId: 'gasly', givenName: 'Pierre', familyName: 'Gasly', driver: 'Pierre Gasly', team: 'Alpine F1 Team', nationality: 'French', gridOrder: 21 },
  { driverId: 'colapinto', givenName: 'Franco', familyName: 'Colapinto', driver: 'Franco Colapinto', team: 'Alpine F1 Team', nationality: 'Argentine', gridOrder: 22 },
];

const GRID_BY_ID = new Map(
  F1_DRIVERS_GRID_2026.map((e) => [e.driverId.toLowerCase(), e]),
);

export function getDriverGridEntry(driverId) {
  return GRID_BY_ID.get(String(driverId || '').trim().toLowerCase()) ?? null;
}
