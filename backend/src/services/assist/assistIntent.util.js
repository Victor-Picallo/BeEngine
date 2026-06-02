/**
 * Detección tolerante de intención (español informal, typos, seguimientos).
 */

const ALL_SERIES_IDS = ['f1', 'f2', 'f3', 'motogp', 'moto2', 'moto3'];

const SERIES_PATTERNS = [
  { id: 'f1', re: /\bf1\b|formula\s*1|formul?a\s*uno|formule\s*1|gran\s*premio\s*de\s*formula/i },
  { id: 'f2', re: /\bf2\b|formula\s*2|formul?a\s*dos/i },
  { id: 'f3', re: /\bf3\b|formula\s*3|formul?a\s*tres/i },
  {
    id: 'motogp',
    re: /\bmotogp\b|moto\s*gp\b|motos?\s*gp\b|gran\s*premio\s*de\s*moto|(?:^|\s)(las\s+)?motos(?:\s|$)|\ben\s+moto\b|\bmoto\b(?!2|3|\s*gp)/i,
  },
  { id: 'moto2', re: /\bmoto\s*2\b|\bmoto2\b/i },
  { id: 'moto3', re: /\bmoto\s*3\b|\bmoto3\b/i },
];

/** @param {string} text */
export function normalizeQuery(text) {
  let s = String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[¿¡]/g, '')
    .replace(/[''`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  s = s
    .replace(/\bmoto\s*gp\b/g, 'motogp')
    .replace(/\bmoto\s*2\b/g, 'moto2')
    .replace(/\bmoto\s*3\b/g, 'moto3')
    .replace(/\bformula\s*(\d)\b/g, 'formula$1')
    .replace(/\bformul?a\s*(uno|dos|tres)\b/g, (_, w) => {
      const map = { uno: 'formula1', dos: 'formula2', tres: 'formula3' };
      return map[w] ?? w;
    })
    .replace(/\bq\s*([uie])\b/g, 'qu$1')
    .replace(/\bklasificacion\b/g, 'clasificacion')
    .replace(/\blider\b/g, 'lider');

  return s;
}

/**
 * @param {string} message
 * @returns {string[]}
 */
export function detectMentionedSeries(message) {
  const m = normalizeQuery(message);
  const out = [];
  for (const { id, re } of SERIES_PATTERNS) {
    if (re.test(m)) out.push(id);
  }
  return [...new Set(out)];
}

/**
 * @param {string} message
 */
export function detectLiveIntents(message) {
  const m = normalizeQuery(message);

  const standings =
    /clasificaci|mundial|campeonato|standings|puntos|tabla|ranking|posiciones|resumen|liderato|leader|top\s*\d|podium|podio general/i.test(
      m,
    ) ||
    /quien\s+(va|lleva|manda|gana|ganando|lidera|esta|está|ir|va mejor)/i.test(m) ||
    /quien\s+es\s+(el\s+)?(1|primero|primer|lider|leader|mejor)/i.test(m) ||
    /(va|van|estan|están|esta|está)\s+(1|primero|primer|lider|de primero|en cabeza)/i.test(m) ||
    /como\s+va(s)?\s+(el\s+)?(mundial|campeonato|temporada|título|titulo)/i.test(m) ||
    /(?:1[º°o]?|primero|primer|lider)\s+(del|de el|en el)\s+(mundial|campeonato)/i.test(m) ||
    /(mundial|campeonato).{0,16}(lider|primero|puntos|tabla)/i.test(m) ||
    /cuantos\s+puntos\s+(lleva|tiene|va)/i.test(m);

  const constructors =
    /escuder|construct|equipos?|fabricantes?|marcas?|constructores/i.test(m) &&
    /(campeonato|mundial|clasificaci|puntos|tabla|lider|primero|va)/i.test(m);

  const nextRace =
    /proxim|siguiente|cuando\s+(es|corren|corre|hay)|calendario|fecha\s+(del|de)\s+(gp|carrera)|en\s+que\s+circuito/i.test(
      m,
    ) &&
    /(carrera|gp|ronda|race|gran\s*premio|evento|prueba)/i.test(m);

  const lastRace =
    /ultim|anterior|pasad|last\s*race|gano|ganó|ganador|resultado|podio|quien\s+gano/i.test(m) &&
    /(carrera|gp|ronda|race|gran\s*premio|prueba)/i.test(m);

  const allSeries =
    /todas?\s+(las\s+)?(categor|series|competiciones)|las\s*6|seis\s+categor|todos\s+los\s+campeonatos|comparar\s+(las\s+)?categor|resumen\s+general|panorama|cada\s+categor|f1.{0,30}f2.{0,30}f3/i.test(
      m,
    );

  const driverLookup =
    /(piloto|driver|rider|corredor)/i.test(m) ||
    /cuantos\s+puntos\s+(tiene|lleva)/i.test(m) ||
    /posicion\s+de|donde\s+esta\s+\w+/i.test(m);

  return { standings, constructors, nextRace, lastRace, allSeries, driverLookup };
}

const SPORTS_LEXICON =
  /piloto|pilots?|rider|corredor|escuder|equipo|construct|carrera|gran\s*premio|\bgp\b|ronda|calendario|puntos|victoria|podio|temporada|campeonato|mundial|clasificaci|circuito|carreras|motogp|moto2|moto3|\bf1\b|\bf2\b|\bf3\b|formula|motos?/i;

const APP_HELP_LEXICON =
  /login|registr|sesion|sesión|contraseña|password|google|favorito|sidebar|menu|menú|perfil|cuenta|ruta|pantalla|como\s+uso|como\s+funciona\s+la\s+app|donde\s+(esta|está)\s+el\s+menu/i;

/**
 * @param {Array<{ role?: string, content?: string }>} history
 */
export function buildContextText(message, history) {
  const prior = (history ?? [])
    .filter((h) => h?.content && (h.role === 'user' || h.role === 'assistant'))
    .slice(-4)
    .map((h) => String(h.content).trim());
  return [...prior, String(message || '').trim()].filter(Boolean).join('\n');
}

/**
 * @param {Array<{ role?: string, content?: string }>} history
 */
export function historyMentionsSportsContext(history) {
  const text = normalizeQuery((history ?? []).map((h) => h?.content ?? '').join(' '));
  return detectLiveIntents(text).standings ||
    detectLiveIntents(text).constructors ||
    detectLiveIntents(text).nextRace ||
    detectLiveIntents(text).lastRace ||
    SPORTS_LEXICON.test(text);
}

/**
 * @param {string} message
 */
export function isSeriesFollowUp(message) {
  const series = detectMentionedSeries(message);
  const m = normalizeQuery(message);
  if (m.length > 140) return false;

  if (series.length && m.split(/\s+/).length <= 12) return true;

  return (
    /^(y|e|and|tambien|también|igual|lo mismo|a ver|oye|vale)\b/i.test(m) ||
    /^(y|e)\s+(en|de|para)\b/i.test(m) ||
    /^(que tal|como va)\b/i.test(m)
  );
}

/**
 * @param {string} message
 * @param {Array<{ role?: string, content?: string }>} history
 */
export function isShortSportsFollowUp(message, history) {
  if (!history?.length) return false;
  const m = normalizeQuery(message);
  if (m.length > 160) return false;
  if (!historyMentionsSportsContext(history)) return false;
  return (
    isSeriesFollowUp(message) ||
    detectLiveIntents(m).standings ||
    detectLiveIntents(m).constructors ||
    detectLiveIntents(m).nextRace ||
    detectLiveIntents(m).lastRace ||
    /^(y|tambien|igual|lo mismo|ahi|a ver|vale)\b/.test(m)
  );
}

/**
 * @param {string} message
 */
export function isPureNavigationQuestion(message) {
  const m = normalizeQuery(message);
  if (m.length < 3) return true;
  if (/^(hola|hi|hey|buenas|gracias|ok|vale|perfecto|genial)\b/.test(m)) return true;

  const appOnly = APP_HELP_LEXICON.test(m) && !SPORTS_LEXICON.test(m);
  const vagueHow =
    /^(como|donde|que)\s/.test(m) &&
    !/(mundial|campeonato|clasificaci|puntos|piloto|carrera|gp|lider|noticias|motogp|formula)/i.test(m);

  return appOnly || vagueHow;
}

/**
 * @param {string} message
 * @param {ReturnType<typeof detectLiveIntents>} intents
 * @param {Array<{ role?: string, content?: string }>} history
 * @param {string} scope
 */
export function isSportsDataQuestion(message, intents, history = [], scope = 'global') {
  if (
    intents.standings ||
    intents.constructors ||
    intents.nextRace ||
    intents.lastRace ||
    intents.driverLookup ||
    intents.allSeries
  ) {
    return true;
  }

  const context = buildContextText(message, history);
  const ctxIntents = detectLiveIntents(context);
  if (
    ctxIntents.standings ||
    ctxIntents.constructors ||
    ctxIntents.nextRace ||
    ctxIntents.lastRace ||
    ctxIntents.driverLookup ||
    ctxIntents.allSeries
  ) {
    return true;
  }

  if (isShortSportsFollowUp(message, history)) return true;
  if (isSeriesFollowUp(message) && historyMentionsSportsContext(history)) return true;

  const m = normalizeQuery(message);
  if (detectMentionedSeries(message).length && m.split(/\s+/).length <= 14) return true;

  if (SPORTS_LEXICON.test(m) && /\?/.test(message)) return true;
  if (SPORTS_LEXICON.test(m) && /^(quien|que|cual|cuanto|cuantos|como|donde|cuando)\b/.test(m)) {
    return true;
  }

  const s = String(scope || 'global').toLowerCase();
  if (ALL_SERIES_IDS.includes(s) && SPORTS_LEXICON.test(m)) return true;
  if (ALL_SERIES_IDS.includes(s) && /\?/.test(message) && m.length < 100) return true;

  return SPORTS_LEXICON.test(m);
}

/**
 * @param {string} message
 * @param {ReturnType<typeof detectLiveIntents>} intents
 */
export function wantsAllSeries(message, intents) {
  if (intents.allSeries) return true;
  const m = normalizeQuery(message);
  return /todas?\s+(las\s+)?(categor|series)|las\s*6|seis\s+categor|todos\s+los\s+campeonatos|resumen\s+(general|motor|de\s+categor)/i.test(
    m,
  );
}

/**
 * @param {string} message
 * @param {string} scope
 * @param {Array<{ role?: string, content?: string }>} history
 */
export function resolveSeriesTargets(message, scope, history = []) {
  const context = buildContextText(message, history);
  const ctxIntents = detectLiveIntents(context);

  if (wantsAllSeries(context, ctxIntents)) return ALL_SERIES_IDS;

  const inMessage = detectMentionedSeries(message);
  if (inMessage.length >= 2) return inMessage;
  if (inMessage.length === 1) return inMessage;

  const inContext = detectMentionedSeries(context);
  if (inContext.length === 1 && (isShortSportsFollowUp(message, history) || inMessage.length === 0)) {
    return inContext;
  }
  if (inContext.length >= 2 && inMessage.length === 0 && isShortSportsFollowUp(message, history)) {
    return inContext;
  }

  const s = String(scope || 'global').toLowerCase();
  if (ALL_SERIES_IDS.includes(s)) return [s];

  if (isSportsDataQuestion(message, ctxIntents, history, scope) && s === 'global') {
    return ALL_SERIES_IDS;
  }

  const mentioned = detectMentionedSeries(context);
  if (mentioned.length === 1) return mentioned;
  if (mentioned.length >= 2) return mentioned;

  return [detectMentionedSeries(message)[0] || (ALL_SERIES_IDS.includes(s) ? s : 'f1')];
}

/**
 * @param {ReturnType<typeof detectLiveIntents>} ctx
 * @param {ReturnType<typeof detectLiveIntents>} cur
 */
export function mergeIntents(ctx, cur) {
  return {
    standings: ctx.standings || cur.standings,
    constructors: ctx.constructors || cur.constructors,
    nextRace: ctx.nextRace || cur.nextRace,
    lastRace: ctx.lastRace || cur.lastRace,
    allSeries: ctx.allSeries || cur.allSeries,
    driverLookup: ctx.driverLookup || cur.driverLookup,
  };
}
