/**
 * Escuderías 2026 que aún no existen en Jolpica/Ergast como constructorId.
 * Fichas servidas desde el backend sin llamar a /constructors/{id}.json.
 */

export const MANUAL_CONSTRUCTOR_IDS = new Set(['audi', 'cadillac']);

/** @typedef {{ constructorId: string, name: string, nationality: string, wikiUrl: string, drivers: object[], bioText: string, standingFallback: { pos: number, points: number, wins: number } | null }} ManualConstructorDef */

/** @type {Record<string, ManualConstructorDef>} */
export const MANUAL_CONSTRUCTORS = {
  audi: {
    constructorId: 'audi',
    name: 'Audi Revolut F1 Team',
    nationality: 'Swiss',
    wikiUrl: 'https://en.wikipedia.org/wiki/Audi_in_Formula_One',
    drivers: [
      {
        driverId: 'bortoleto',
        givenName: 'Gabriel',
        familyName: 'Bortoleto',
        code: 'BOR',
        number: 5,
        nationality: 'Brazilian',
      },
      {
        driverId: 'hulkenberg',
        givenName: 'Nico',
        familyName: 'Hülkenberg',
        code: 'HUL',
        number: 27,
        nationality: 'German',
      },
    ],
    bioText:
      'Audi debuta en la Fórmula 1 en 2026 como equipo oficial (Audi Revolut F1 Team), ' +
      'continuando la estructura de Sauber en Hinwil (Suiza) con motor propio de Audi AG. ' +
      'Mattia Binotto lidera el proyecto; Gabriel Bortoleto y Nico Hülkenberg forman la alineación. ' +
      'Jolpica/Ergast aún no publica esta escudería como entrada histórica: los datos de esta ficha son curados en BeEngine.',
    standingFallback: { pos: 11, points: 0, wins: 0 },
  },
  cadillac: {
    constructorId: 'cadillac',
    name: 'Cadillac F1 Team',
    nationality: 'American',
    wikiUrl: 'https://en.wikipedia.org/wiki/Cadillac_in_Formula_One',
    drivers: [
      {
        driverId: 'perez',
        givenName: 'Sergio',
        familyName: 'Pérez',
        code: 'PER',
        number: 11,
        nationality: 'Mexican',
      },
      {
        driverId: 'bottas',
        givenName: 'Valtteri',
        familyName: 'Bottas',
        code: 'BOT',
        number: 77,
        nationality: 'Finnish',
      },
    ],
    bioText:
      'Cadillac es el undécimo equipo de la parrilla en 2026, con sede en Estados Unidos y respaldo de General Motors. ' +
      'Sergio Pérez y Valtteri Bottas pilotan los monoplazas en la temporada inaugural. ' +
      'Al no figurar aún en Jolpica/Ergast, la clasificación y la ficha se mantienen con datos locales hasta que la API los incorpore.',
    standingFallback: { pos: 12, points: 0, wins: 0 },
  },
};

export function isManualConstructorId(id) {
  return MANUAL_CONSTRUCTOR_IDS.has(String(id || '').trim().toLowerCase());
}

export function getManualConstructorDef(id) {
  return MANUAL_CONSTRUCTORS[String(id || '').trim().toLowerCase()] ?? null;
}

/**
 * Filas para fusionar en /constructor-standings si Jolpica no las trae.
 * @param {number} seasonYear
 */
export function manualConstructorStandingRows(seasonYear = new Date().getUTCFullYear()) {
  return Object.values(MANUAL_CONSTRUCTORS).map((c) => ({
    pos: c.standingFallback?.pos ?? 99,
    team: c.name,
    constructorId: c.constructorId,
    points: c.standingFallback?.points ?? 0,
    wins: c.standingFallback?.wins ?? 0,
    nationality: c.nationality,
    _seasonYear: seasonYear,
  }));
}
