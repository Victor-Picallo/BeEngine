/**
 * Parrilla F2 2026 — datos curados BeEngine (standings tras Melbourne + Miami).
 * @typedef {{ driverId: string, givenName: string, familyName: string, driver: string, team: string, nationality: string, gridOrder: number }} F2DriverGridEntry
 */

/** @type {F2DriverGridEntry[]} */
export const F2_DRIVERS_GRID_2026 = [
  { driverId: 'tsolov', givenName: 'Nikola', familyName: 'Tsolov', driver: 'Nikola Tsolov', team: 'Campos Racing', nationality: 'Bulgarian', gridOrder: 1 },
  { driverId: 'mini', givenName: 'Gabriele', familyName: 'Minì', driver: 'Gabriele Minì', team: 'MP Motorsport', nationality: 'Italian', gridOrder: 2 },
  { driverId: 'camara', givenName: 'Rafael', familyName: 'Câmara', driver: 'Rafael Câmara', team: 'Invicta Racing', nationality: 'Brazilian', gridOrder: 3 },
  { driverId: 'van_hoepen', givenName: 'Laurens', familyName: 'van Hoepen', driver: 'Laurens van Hoepen', team: 'Trident', nationality: 'Dutch', gridOrder: 4 },
  { driverId: 'miyata', givenName: 'Ritomo', familyName: 'Miyata', driver: 'Ritomo Miyata', team: 'Hitech', nationality: 'Japanese', gridOrder: 5 },
  { driverId: 'leon', givenName: 'Noel', familyName: 'León', driver: 'Noel León', team: 'Campos Racing', nationality: 'Mexican', gridOrder: 6 },
  { driverId: 'beganovic', givenName: 'Dino', familyName: 'Beganovic', driver: 'Dino Beganovic', team: 'DAMS Lucas Oil', nationality: 'Swiss', gridOrder: 7 },
  { driverId: 'durksen', givenName: 'Joshua', familyName: 'Dürksen', driver: 'Joshua Dürksen', team: 'Invicta Racing', nationality: 'Paraguayan', gridOrder: 8 },
  { driverId: 'inthraphuvasak', givenName: 'Tasanapol', familyName: 'Inthraphuvasak', driver: 'Tasanapol Inthraphuvasak', team: 'ART Grand Prix', nationality: 'Thai', gridOrder: 9 },
  { driverId: 'dunne', givenName: 'Alex', familyName: 'Dunne', driver: 'Alex Dunne', team: 'Rodin Motorsport', nationality: 'Irish', gridOrder: 10 },
  { driverId: 'goethe', givenName: 'Oliver', familyName: 'Goethe', driver: 'Oliver Goethe', team: 'MP Motorsport', nationality: 'German', gridOrder: 11 },
  { driverId: 'maini', givenName: 'Kush', familyName: 'Maini', driver: 'Kush Maini', team: 'ART Grand Prix', nationality: 'Indian', gridOrder: 12 },
  { driverId: 'herta', givenName: 'Colton', familyName: 'Herta', driver: 'Colton Herta', team: 'Hitech', nationality: 'American', gridOrder: 13 },
  { driverId: 'boya', givenName: 'Mari', familyName: 'Boya', driver: 'Mari Boya', team: 'Prema Racing', nationality: 'Spanish', gridOrder: 14 },
  { driverId: 'varrone', givenName: 'Nico', familyName: 'Varrone', driver: 'Nico Varrone', team: 'Van Amersfoort Racing', nationality: 'Argentine', gridOrder: 15 },
  { driverId: 'stenshorne', givenName: 'Martinius', familyName: 'Stenshorne', driver: 'Martinius Stenshorne', team: 'Rodin Motorsport', nationality: 'Norwegian', gridOrder: 16 },
  { driverId: 'montoya', givenName: 'Sebastián', familyName: 'Montoya', driver: 'Sebastián Montoya', team: 'Prema Racing', nationality: 'Colombian', gridOrder: 17 },
  { driverId: 'bilinski', givenName: 'Roman', familyName: 'Bilinski', driver: 'Roman Bilinski', team: 'DAMS Lucas Oil', nationality: 'Polish', gridOrder: 18 },
  { driverId: 'villagomez', givenName: 'Rafael', familyName: 'Villagómez', driver: 'Rafael Villagómez', team: 'Van Amersfoort Racing', nationality: 'Mexican', gridOrder: 19 },
  { driverId: 'fittipaldi', givenName: 'Emerson', familyName: 'Fittipaldi Jr.', driver: 'Emerson Fittipaldi Jr.', team: 'AIX Racing', nationality: 'Brazilian', gridOrder: 20 },
  { driverId: 'bennett', givenName: 'John', familyName: 'Bennett', driver: 'John Bennett', team: 'Trident', nationality: 'British', gridOrder: 21 },
  { driverId: 'shields', givenName: 'Cian', familyName: 'Shields', driver: 'Cian Shields', team: 'AIX Racing', nationality: 'British', gridOrder: 22 },
];

/** Puntos oficiales tras R1–R3 (Melbourne + Miami + Montreal). */
export const F2_DRIVER_POINTS_2026 = {
  mini: 57,
  camara: 36,
  tsolov: 35,
  stenshorne: 35,
  leon: 33,
  van_hoepen: 33,
  dunne: 30,
  beganovic: 24,
  miyata: 22,
  durksen: 16,
  montoya: 16,
  herta: 16,
  varrone: 14,
  maini: 14,
  inthraphuvasak: 13,
  goethe: 12,
  shields: 10,
  boya: 10,
  fittipaldi: 4,
  bilinski: 2,
  villagomez: 0,
  benavides: 0,
};
