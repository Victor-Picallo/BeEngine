/**
 * Metadatos de equipo MotoGP (bio, Wikipedia, alias históricos para clasificaciones Pulse).
 * Los puntos/posiciones del historial se calculan en vivo desde /results/standings.
 */

/** @typedef {{
 *   constructorId: string,
 *   name: string,
 *   nationality: string,
 *   wikiUrl: string,
 *   bioText: string,
 *   championships: number,
 *   manufacturerSlug?: string,
 *   linkedManufacturerSlug?: string,
 *   historyFromYear?: number,
 *   slugAliases: string[],
 *   debutYear: number,
 * }} MotogpTeamProfileDef */

/** @type {Record<string, MotogpTeamProfileDef>} */
export const MOTOGP_TEAM_PROFILES = {
  'aprilia-racing': {
    constructorId: 'aprilia-racing',
    name: 'Aprilia Racing',
    nationality: 'Italia',
    wikiUrl: 'https://es.wikipedia.org/wiki/Aprilia_Racing',
    bioText:
      'Aprilia Racing es el equipo oficial de fábrica de Aprilia en MotoGP, con sede en Noale (Italia). ' +
      'Tras el regreso de la marca al campeonato en 2016, el proyecto ha evolucionado hacia la lucha por podios y victorias con la RS-GP. ' +
      'En 2026 compite con Aleix Espargaró y Marco Bezzecchi bajo el paraguas de la estructura de fábrica.',
    championships: 0,
    manufacturerSlug: 'aprilia',
    historyFromYear: 2016,
    slugAliases: ['aprilia-racing', 'aprilia', 'aprilia-racing-team-gresini', 'gresini-racing'],
    debutYear: 2016,
  },
  'bk8-gresini-racing-motogp': {
    constructorId: 'bk8-gresini-racing-motogp',
    name: 'BK8 Gresini Racing MotoGP',
    nationality: 'Italia',
    wikiUrl: 'https://es.wikipedia.org/wiki/Gresini_Racing',
    bioText:
      'Gresini Racing es un equipo italiano histórico en el paddock, fundado por Fausto Gresini. ' +
      'Tras etapas como satélite de Honda y Aprilia, en 2026 corre como equipo independiente con motores Ducati bajo el patrocinio BK8. ' +
      'La estructura de Casole d’Elsa mantiene una de las trayectorias más reconocibles del campeonato.',
    championships: 0,
    linkedManufacturerSlug: 'ducati',
    slugAliases: [
      'bk8-gresini-racing-motogp',
      'gresini-racing-motogp',
      'gresini-racing',
      'aprilia-racing-team-gresini',
    ],
    debutYear: 2002,
  },
  'ducati-lenovo-team': {
    constructorId: 'ducati-lenovo-team',
    name: 'Ducati Lenovo Team',
    nationality: 'Italia',
    wikiUrl: 'https://es.wikipedia.org/wiki/Ducati_Corse',
    bioText:
      'Ducati Lenovo Team es el equipo oficial de Ducati en MotoGP, con base en Borgo Panigale. ' +
      'Dominador de la era moderna del campeonato, ha cosechado múltiples títulos de pilotos y constructores con la Desmosedici. ' +
      'Lenovo es el patrocinador principal del proyecto de fábrica en la temporada 2026.',
    championships: 7,
    manufacturerSlug: 'ducati',
    historyFromYear: 2003,
    slugAliases: ['ducati-lenovo-team', 'ducati-team', 'ducati', 'ducati-lenovo'],
    debutYear: 2003,
  },
  'honda-hrc-castrol': {
    constructorId: 'honda-hrc-castrol',
    name: 'Honda HRC Castrol',
    nationality: 'Japón',
    wikiUrl: 'https://es.wikipedia.org/wiki/Honda_HRC_Castrol',
    bioText:
      'Honda HRC Castrol es la escudería oficial de Honda Racing Corporation en MotoGP, con sede en Japón. ' +
      'Tras décadas como referencia del campeonato, el equipo de fábrica compite con la RC213V y el respaldo técnico de HRC. ' +
      'Castrol sustituye a Repsol como patrocinador principal del equipo en la temporada 2026.',
    championships: 25,
    manufacturerSlug: 'honda',
    historyFromYear: 1949,
    slugAliases: [
      'honda-hrc-castrol',
      'repsol-honda-team',
      'honda-hrc',
      'hrc-honda',
      'repsol-honda',
    ],
    debutYear: 1979,
  },
  'lcr-honda': {
    constructorId: 'lcr-honda',
    name: 'LCR Honda',
    nationality: 'Italia',
    wikiUrl: 'https://es.wikipedia.org/wiki/LCR_(equipo)',
    bioText:
      'LCR Honda es el equipo satélite de Lucio Cecchinello, una de las estructuras más longevas del paddock. ' +
      'Con sede en Italia, ha dado salida a grandes talentos y suma victorias y podios con Honda de fábrica. ' +
      'En 2026 compite como Castrol Honda LCR con motocicletas oficiales suministradas por HRC.',
    championships: 0,
    linkedManufacturerSlug: 'honda',
    slugAliases: ['lcr-honda', 'lcr-honda-castrol', 'castrol-honda-lcr', 'lcr', 'team-lcr'],
    debutYear: 1996,
  },
  'monster-energy-yamaha-motogp': {
    constructorId: 'monster-energy-yamaha-motogp',
    name: 'Monster Energy Yamaha MotoGP',
    nationality: 'Japón',
    wikiUrl: 'https://es.wikipedia.org/wiki/Yamaha_Motor_Racing',
    bioText:
      'Monster Energy Yamaha MotoGP es el equipo oficial de Yamaha en el campeonato, con operaciones en Iwata. ' +
      'La estructura de fábrica ha ganado múltiples títulos mundiales y sigue siendo referencia en desarrollo de chasis y electrónica. ' +
      'Monster Energy aparece como patrocinador principal en la temporada 2026.',
    championships: 14,
    manufacturerSlug: 'yamaha',
    historyFromYear: 1949,
    slugAliases: [
      'monster-energy-yamaha-motogp',
      'yamaha-factory-racing',
      'yamaha-motogp',
      'monster-yamaha',
      'yamaha-racing',
    ],
    debutYear: 2002,
  },
  'pertamina-enduro-vr46-racing-team': {
    constructorId: 'pertamina-enduro-vr46-racing-team',
    name: 'Pertamina Enduro VR46 Racing Team',
    nationality: 'Italia',
    wikiUrl: 'https://es.wikipedia.org/wiki/VR46_Racing_Team',
    bioText:
      'El equipo VR46 nació del legado de Valentino Rossi y compite desde Tavullia con identidad propia en MotoGP. ' +
      'Tras su paso por Yamaha y Ducati como satélite, en 2026 lo hace con motores Ducati bajo el patrocinio Pertamina Enduro. ' +
      'Es uno de los proyectos más seguidos del campeonato por su vinculación con la Academia VR46.',
    championships: 0,
    linkedManufacturerSlug: 'ducati',
    slugAliases: [
      'pertamina-enduro-vr46-racing-team',
      'vr46-racing-team',
      'mooney-vr46-racing-team',
      'sky-vr46',
      'vr46',
    ],
    debutYear: 2022,
  },
  'prima-pramac-yamaha-motogp': {
    constructorId: 'prima-pramac-yamaha-motogp',
    name: 'Prima Pramac Yamaha MotoGP',
    nationality: 'Italia',
    wikiUrl: 'https://es.wikipedia.org/wiki/Pramac_Racing',
    bioText:
      'Pramac Racing es un equipo satélite italiano con sede en Casole d’Elsa, presente en MotoGP desde hace décadas. ' +
      'En 2026 corre con Yamaha como Prima Pramac Yamaha MotoGP, continuando la tradición de formar jóvenes talentos y pilotos experimentados. ' +
      'Pramac es una de las estructuras satélite más constantes del paddock.',
    championships: 0,
    linkedManufacturerSlug: 'yamaha',
    slugAliases: [
      'prima-pramac-yamaha-motogp',
      'pramac-racing',
      'pramac-yamaha',
      'octo-pramac',
      'pramac',
    ],
    debutYear: 2002,
  },
  'red-bull-ktm-factory-racing': {
    constructorId: 'red-bull-ktm-factory-racing',
    name: 'Red Bull KTM Factory Racing',
    nationality: 'Austria',
    wikiUrl: 'https://es.wikipedia.org/wiki/Red_Bull_KTM_Factory_Racing',
    bioText:
      'Red Bull KTM Factory Racing es el equipo oficial de KTM en MotoGP, con base en Austria. ' +
      'El proyecto de fábrica ha escalado hasta pelear por victorias con la RC16 tras su debut en la categoría reina. ' +
      'Red Bull es el socio de branding principal del equipo en 2026.',
    championships: 0,
    manufacturerSlug: 'ktm',
    historyFromYear: 2017,
    slugAliases: [
      'red-bull-ktm-factory-racing',
      'ktm-factory-racing',
      'red-bull-ktm',
      'ktm-racing',
    ],
    debutYear: 2017,
  },
  'red-bull-ktm-tech3': {
    constructorId: 'red-bull-ktm-tech3',
    name: 'Red Bull KTM Tech3',
    nationality: 'Francia',
    wikiUrl: 'https://es.wikipedia.org/wiki/Tech3',
    bioText:
      'Tech3 es un equipo satélite con sede en Bormes-les-Mimosas (Francia), fundado por Hervé Poncharal. ' +
      'Ha competido con distintos fabricantes y en 2026 forma pareja de fábrica con KTM como Red Bull KTM Tech3. ' +
      'La estructura es conocida por desarrollar pilotos y aportar regularidad al campeonato.',
    championships: 0,
    linkedManufacturerSlug: 'ktm',
    slugAliases: [
      'red-bull-ktm-tech3',
      'tech3',
      'tech-3',
      'red-bull-ktm-tech-3',
      'gasgas-factory-racing-tech3',
      'red-bull-gasgas-tech3',
    ],
    debutYear: 2001,
  },
  'trackhouse-motogp-team': {
    constructorId: 'trackhouse-motogp-team',
    name: 'Trackhouse MotoGP Team',
    nationality: 'Estados Unidos',
    wikiUrl: 'https://es.wikipedia.org/wiki/Trackhouse_Racing',
    bioText:
      'Trackhouse Racing es una organización estadounidense que debutó en MotoGP en 2024 tras adquirir la plaza de RNF Racing. ' +
      'Con Aprilia como suministrador, el equipo ha sumado victorias y podios en poco tiempo bajo la dirección de Davide Brivio. ' +
      'En 2026 continúa como satélite oficial con identidad propia en el campeonato.',
    championships: 0,
    linkedManufacturerSlug: 'aprilia',
    slugAliases: [
      'trackhouse-motogp-team',
      'trackhouse-racing',
      'rnf-racing',
      'cryptodata-rnf-motogp-team',
    ],
    debutYear: 2024,
  },
};

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const teamSlugMatchesProfile = (teamSlug, profile) => {
  const slug = slugify(teamSlug);
  if (!slug || !profile) return false;
  const keys = [profile.constructorId, ...(profile.slugAliases ?? [])].map(slugify);
  return keys.some((k) => k === slug || slug.includes(k) || k.includes(slug));
};

export const createDynamicTeamProfileDef = (constructorId, teamName) => {
  const id = slugify(constructorId || teamName);
  if (!id) return null;
  return {
    constructorId: id,
    name: teamName || id,
    nationality: '',
    wikiUrl: '',
    bioText: '',
    championships: 0,
    slugAliases: [id],
    debutYear: 2002,
  };
};

export const getMotogpTeamProfileDef = (constructorId) => {
  const key = slugify(constructorId);
  if (MOTOGP_TEAM_PROFILES[key]) return MOTOGP_TEAM_PROFILES[key];
  for (const def of Object.values(MOTOGP_TEAM_PROFILES)) {
    if (teamSlugMatchesProfile(key, def)) return def;
  }
  return null;
};
