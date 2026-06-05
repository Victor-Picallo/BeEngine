import type { SeriesId } from '../../core/series/series.types';

export const LANDING_ACCENT = '#FFD100';

export interface LandingCategoryMeta {
  id: SeriesId;
  name: string;
  tag: string;
  accent: string;
  desc: string;
  shape: 'car' | 'moto';
  route: string;
}

/** Textos fijos de marca; cifras y nombres vienen del API en tiempo de carga. */
export const LANDING_CATEGORIES_META: LandingCategoryMeta[] = [
  {
    id: 'f1',
    name: 'Formula 1',
    tag: 'AUTOMOVILISMO',
    accent: '#E10600',
    desc: 'La categoría reina del automovilismo mundial. Monoplazas híbridos V6 turbo de más de 1.000 CV.',
    shape: 'car',
    route: '/inicio',
  },
  {
    id: 'f2',
    name: 'Formula 2',
    tag: 'AUTOMOVILISMO',
    accent: '#0090D4',
    desc: 'La antesala de la F1. Chasis Dallara idéntico para todos: el talento marca la diferencia.',
    shape: 'car',
    route: '/f2',
  },
  {
    id: 'f3',
    name: 'Formula 3',
    tag: 'AUTOMOVILISMO',
    accent: '#E8A200',
    desc: 'El tercer escalón de la FIA hacia la F1. Monoplazas iguales y pura igualdad competitiva.',
    shape: 'car',
    route: '/f3',
  },
  {
    id: 'motogp',
    name: 'MotoGP',
    tag: 'MOTOCICLISMO',
    accent: '#CC0000',
    desc: 'La categoría reina del motociclismo. Prototipos de 1.000cc que superan los 360 km/h.',
    shape: 'moto',
    route: '/motogp',
  },
  {
    id: 'moto2',
    name: 'Moto2',
    tag: 'MOTOCICLISMO',
    accent: '#00853F',
    desc: 'La categoría intermedia. Motores Triumph de 765cc tricilíndricos para todos los equipos.',
    shape: 'moto',
    route: '/moto2',
  },
  {
    id: 'moto3',
    name: 'Moto3',
    tag: 'MOTOCICLISMO',
    accent: '#0066B1',
    desc: 'La puerta de entrada al Mundial. Monocilíndricas de 250cc y las carreras más disputadas.',
    shape: 'moto',
    route: '/moto3',
  },
];

export interface LandingFeature {
  id: string;
  name: string;
  desc: string;
  route: string;
}

export interface LandingFeatureGroup {
  label: string;
  title: string;
  items: LandingFeature[];
}

/** Seis secciones de la app (sin asistente: tiene bloque propio). */
export const LANDING_FEATURE_GROUPS: LandingFeatureGroup[] = [
  {
    label: 'Competición',
    title: 'Sigue cada ronda',
    items: [
      {
        id: 'home',
        name: 'Home',
        desc: 'Próxima carrera, standings y último GP en tu portada.',
        route: '/inicio',
      },
      {
        id: 'calendar',
        name: 'Calendario',
        desc: 'Rondas, circuitos, horarios y resultados sesión a sesión.',
        route: '/f1/calendario',
      },
      {
        id: 'standings',
        name: 'Clasificación',
        desc: 'Pilotos y constructores con puntos y evolución por GP.',
        route: '/f1/clasificacion',
      },
    ],
  },
  {
    label: 'Paddock',
    title: 'Profundiza en cada mundo',
    items: [
      {
        id: 'news',
        name: 'Noticias',
        desc: 'Mercado, análisis y actualidad del momento en el feed.',
        route: '/f1/noticias',
      },
      {
        id: 'drivers',
        name: 'Pilotos',
        desc: 'Biografía, stats, trayectoria y foto oficial del piloto.',
        route: '/f1/pilotos',
      },
      {
        id: 'teams',
        name: 'Escuderías',
        desc: 'Plantilla, monoplaza o moto, historia y palmarés del equipo.',
        route: '/f1/escuderias',
      },
    ],
  },
];

export const LANDING_TICKER = [
  'FORMULA 1',
  'FORMULA 2',
  'FORMULA 3',
  'MOTOGP',
  'MOTO2',
  'MOTO3',
];

export const LANDING_ACCOUNT_BULLETS = [
  'Sigue pilotos y equipos de las 6 categorías',
  'Portada personalizada con tus favoritos',
  'Sincroniza entre todos tus dispositivos',
  'Datos reales sincronizados desde la base de datos',
];

export const LANDING_ASSIST_BULLETS = [
  'Pregunta en español natural: «¿Quién lidera MotoGP?», «Próxima carrera de F1»…',
  'Respuestas con datos en vivo y contexto de las 6 categorías',
  'Combina base de conocimiento, noticias y clasificaciones actualizadas',
  'Disponible en toda la app: un clic en el botón flotante amarillo',
];

export interface LandingAssistDemoMessage {
  role: 'user' | 'assistant';
  text: string;
}

export const LANDING_ASSIST_DEMO: LandingAssistDemoMessage[] = [
  { role: 'user', text: '¿Quién lidera MotoGP ahora mismo?' },
  {
    role: 'assistant',
    text: 'Marco Bezzecchi (Aprilia Racing) encabeza el Mundial con 173 puntos, por delante de Bagnaia y Martín.',
  },
  { role: 'user', text: '¿Y en F1 quién va primero?' },
  {
    role: 'assistant',
    text: 'En pilotos, Andrea Kimi Antonelli lidera con Mercedes. Te puedo detallar constructores o la próxima ronda si quieres.',
  },
];

/** Ruta para explorar la app sin registro. */
export const LANDING_GUEST_ROUTE = '/inicio';

export interface LandingApiSource {
  name: string;
  url: string;
}

export interface LandingApiGroup {
  title: string;
  items: LandingApiSource[];
}

/** Fuentes externas que alimentan BeEngine (enlaces al sitio oficial de cada API). */
export const LANDING_API_GROUPS: LandingApiGroup[] = [
  {
    title: 'Datos deportivos',
    items: [
      { name: 'Jolpica (Ergast)', url: 'https://api.jolpi.ca/ergast/f1' },
      { name: 'OpenF1', url: 'https://openf1.org' },
      { name: 'FIA Formula 2', url: 'https://www.fiaformula2.com' },
      { name: 'FIA Formula 3', url: 'https://www.fiaformula3.com' },
      { name: 'Pulse Live (MotoGP)', url: 'https://www.motogp.com' },
      { name: 'Open-Meteo', url: 'https://open-meteo.com' },
    ],
  },
  {
    title: 'Infraestructura',
    items: [
      { name: 'Supabase', url: 'https://supabase.com' },
      { name: 'Groq', url: 'https://groq.com' },
    ],
  },
  {
    title: 'Noticias (RSS)',
    items: [
      { name: 'BBC Sport', url: 'https://www.bbc.co.uk/sport/formula1' },
      { name: 'Formula 1', url: 'https://www.formula1.com' },
      { name: 'Motorsport.com', url: 'https://www.motorsport.com' },
      { name: 'Crash.net', url: 'https://www.crash.net' },
    ],
  },
];
