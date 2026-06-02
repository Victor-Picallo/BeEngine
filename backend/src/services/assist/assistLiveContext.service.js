import { CURRENT_SEASON_YEAR, DB_ENABLED, ASSIST_LIVE_MAX_CHARS } from '../../config/env.js';
import {
  buildContextText,
  detectLiveIntents,
  detectMentionedSeries,
  isPureNavigationQuestion,
  isSportsDataQuestion,
  mergeIntents,
  normalizeQuery,
  resolveSeriesTargets,
} from './assistIntent.util.js';
import { getDriverStandings as getF1Drivers, getConstructorStandings as getF1Teams, getCalendar as getF1Calendar, getLastRace as getF1LastRace } from '../f1/jolpica.service.js';
import { getDriverStandings as getF2Drivers, getConstructorStandings as getF2Teams, getCalendar as getF2Calendar, getLastRace as getF2LastRace } from '../f2/f2Data.service.js';
import { getDriverStandings as getF3Drivers, getConstructorStandings as getF3Teams, getCalendar as getF3Calendar, getLastRace as getF3LastRace } from '../f3/f3Data.service.js';
import {
  getDriverStandings as getMotoDrivers,
  getConstructorStandings as getMotoTeams,
  getCalendar as getMotoCalendar,
  getLastRace as getMotoLastRace,
} from '../motogp/pulseLive.service.js';

const ALL_SERIES_IDS = ['f1', 'f2', 'f3', 'motogp', 'moto2', 'moto3'];

const SERIES_LABEL = {
  f1: 'Formula 1',
  f2: 'Formula 2',
  f3: 'Formula 3',
  motogp: 'MotoGP',
  moto2: 'Moto2',
  moto3: 'Moto3',
};

const SERIES_API = {
  f1: {
    drivers: getF1Drivers,
    teams: getF1Teams,
    calendar: getF1Calendar,
    lastRace: getF1LastRace,
  },
  f2: {
    drivers: getF2Drivers,
    teams: getF2Teams,
    calendar: getF2Calendar,
    lastRace: getF2LastRace,
  },
  f3: {
    drivers: getF3Drivers,
    teams: getF3Teams,
    calendar: getF3Calendar,
    lastRace: getF3LastRace,
  },
  motogp: {
    drivers: () => getMotoDrivers('motogp'),
    teams: () => getMotoTeams('motogp'),
    calendar: () => getMotoCalendar('motogp'),
    lastRace: () => getMotoLastRace('motogp'),
  },
  moto2: {
    drivers: () => getMotoDrivers('moto2'),
    teams: () => getMotoTeams('moto2'),
    calendar: () => getMotoCalendar('moto2'),
    lastRace: () => getMotoLastRace('moto2'),
  },
  moto3: {
    drivers: () => getMotoDrivers('moto3'),
    teams: () => getMotoTeams('moto3'),
    calendar: () => getMotoCalendar('moto3'),
    lastRace: () => getMotoLastRace('moto3'),
  },
};

export { detectLiveIntents, detectMentionedSeries } from './assistIntent.util.js';

/**
 * @param {string} message
 * @param {string} scope
 */
export function resolveSeriesId(message, scope) {
  return resolveSeriesTargets(message, scope, [])[0] ?? 'f1';
}

function effectiveIntents(intents, multiSeries) {
  const any = intents.standings || intents.constructors || intents.nextRace || intents.lastRace;
  if (any) return intents;
  if (multiSeries) {
    return { ...intents, standings: true, constructors: true, nextRace: true, lastRace: true };
  }
  return {
    ...intents,
    standings: true,
    constructors: true,
    nextRace: true,
    lastRace: true,
  };
}

function formatDriverStandings(items, limit = 12) {
  if (!items?.length) return 'Sin datos de clasificación de pilotos.';
  return items
    .slice(0, limit)
    .map(
      (d) =>
        `${d.pos}. ${d.driver} (${d.team}) — ${d.points} pts${d.wins != null ? `, ${d.wins} victorias` : ''}`,
    )
    .join('\n');
}

function formatTeamStandings(items, limit = 10) {
  if (!items?.length) return 'Sin datos de clasificación de equipos/escuderías.';
  return items
    .slice(0, limit)
    .map((c) => `${c.pos}. ${c.team} — ${c.points} pts`)
    .join('\n');
}

function pickNextRace(calendarItems) {
  const items = calendarItems ?? [];
  return items.find((r) => !r.resultsAvailable) ?? items[items.length - 1] ?? null;
}

function formatNextRace(race) {
  if (!race) return 'No hay próxima carrera en calendario.';
  const date = race.date ?? race.raceDate ?? '';
  const circuit = race.circuitName ?? race.Circuit?.circuitName ?? '';
  return `${race.raceName ?? 'GP'}${date ? ` (${date})` : ''}${circuit ? ` — ${circuit}` : ''}`;
}

function formatLastRace(race) {
  if (!race?.results?.length) {
    return race?.raceName ? `Última carrera: ${race.raceName} (sin detalle de resultados).` : 'Sin última carrera.';
  }
  const podium = race.results
    .slice(0, 3)
    .map((r) => `P${r.position} ${r.driver}${r.team ? ` (${r.team})` : ''}`)
    .join(', ');
  return `${race.raceName ?? 'GP'}${race.date ? ` (${race.date})` : ''}: ${podium}`;
}

/**
 * @param {string} seriesId
 */
async function fetchSeriesBundle(seriesId) {
  const api = SERIES_API[seriesId];
  const [drivers, teams, calendar, lastRace] = await Promise.all([
    api.drivers().catch(() => ({ items: [], source: 'n/a' })),
    api.teams().catch(() => ({ items: [], source: 'n/a' })),
    api.calendar().catch(() => ({ items: [] })),
    api.lastRace().catch(() => null),
  ]);
  return { drivers, teams, calendar, lastRace };
}

/**
 * @param {string} seriesId
 * @param {{ drivers: object, teams: object, calendar: object, lastRace: object }} bundle
 */
function formatSeriesCompact(seriesId, bundle) {
  const label = SERIES_LABEL[seriesId];
  const lines = [`### ${label}`];
  const d0 = bundle.drivers?.items?.[0];
  const t0 = bundle.teams?.items?.[0];
  if (d0) {
    lines.push(
      `- Líder pilotos: ${d0.driver} (${d0.team}) — ${d0.points} pts (P${d0.pos})`,
    );
  } else {
    lines.push('- Líder pilotos: sin datos');
  }
  if (t0) {
    lines.push(`- Líder equipos: ${t0.team} — ${t0.points} pts (P${t0.pos})`);
  }
  const next = pickNextRace(bundle.calendar?.items);
  lines.push(`- Próxima carrera: ${formatNextRace(next)}`);
  lines.push(`- Última carrera: ${formatLastRace(bundle.lastRace)}`);
  return lines.join('\n');
}

/**
 * Busca coincidencias de nombre de piloto en todas las series.
 * @param {string} message
 */
async function buildDriverLookupBlock(message) {
  const tokens = normalizeQuery(message)
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 4 &&
        !/^(quien|que|cual|cuanto|cuantos|puntos|mundial|piloto|donde|como|cuando|como|esta|estan|tiene|lleva)/.test(
          w,
        ),
    );
  if (tokens.length < 1) return '';

  const hits = [];
  await Promise.all(
    ALL_SERIES_IDS.map(async (seriesId) => {
      try {
        const { items } = await SERIES_API[seriesId].drivers();
        for (const d of items ?? []) {
          const name = String(d.driver || '').toLowerCase();
          const parts = name.split(/\s+/);
          const matched = tokens.some(
            (t) => name.includes(t) || parts.some((p) => p.startsWith(t) || t.startsWith(p)),
          );
          if (matched) {
            hits.push(
              `${SERIES_LABEL[seriesId]}: ${d.driver} (${d.team}) — P${d.pos}, ${d.points} pts`,
            );
          }
        }
      } catch {
        /* ignore */
      }
    }),
  );

  if (!hits.length) return '';
  return `\n### Pilotos mencionados (búsqueda en clasificaciones)\n${hits.slice(0, 12).join('\n')}`;
}

/**
 * @param {string} seriesId
 * @param {object} intents
 */
async function buildSingleSeriesDetail(seriesId, intents) {
  const label = SERIES_LABEL[seriesId];
  const api = SERIES_API[seriesId];
  const lines = [`### ${label} (detalle)`];
  const tasks = [];

  if (intents.standings) {
    tasks.push(
      (async () => {
        try {
          const pack = await api.drivers();
          lines.push(
            `\n**Clasificación pilotos** (fuente: ${pack.source ?? 'db'})\n${formatDriverStandings(pack.items)}`,
          );
          if (pack.items?.[0]) {
            lines.push(
              `Líder: **${pack.items[0].driver}** (${pack.items[0].team}) — ${pack.items[0].points} pts.`,
            );
          }
        } catch {
          lines.push('\nClasificación pilotos: no disponible.');
        }
      })(),
    );
  }

  if (intents.constructors) {
    tasks.push(
      (async () => {
        try {
          const pack = await api.teams();
          lines.push(
            `\n**Clasificación equipos** (fuente: ${pack.source ?? 'db'})\n${formatTeamStandings(pack.items)}`,
          );
        } catch {
          /* optional */
        }
      })(),
    );
  }

  if (intents.nextRace) {
    tasks.push(
      (async () => {
        try {
          const pack = await api.calendar();
          lines.push(`\n**Próxima carrera**\n${formatNextRace(pickNextRace(pack.items))}`);
        } catch {
          lines.push('\nPróxima carrera: no disponible.');
        }
      })(),
    );
  }

  if (intents.lastRace) {
    tasks.push(
      (async () => {
        try {
          const race = await api.lastRace();
          lines.push(`\n**Última carrera**\n${formatLastRace(race)}`);
        } catch {
          lines.push('\nÚltima carrera: no disponible.');
        }
      })(),
    );
  }

  await Promise.all(tasks);
  return lines.join('\n');
}

/**
 * @param {{ scope?: string, message: string, history?: Array<{ role?: string, content?: string }> }} opts
 */
export async function buildLiveContext({ scope, message, history = [] }) {
  if (!DB_ENABLED) {
    return { text: '', sources: [], used: false };
  }

  const contextText = buildContextText(message, history);
  const rawIntents = mergeIntents(detectLiveIntents(contextText), detectLiveIntents(message));
  if (isPureNavigationQuestion(message) && !rawIntents.standings && !rawIntents.driverLookup) {
    return { text: '', sources: [], used: false };
  }
  if (!isSportsDataQuestion(message, rawIntents, history, scope)) {
    return { text: '', sources: [], used: false };
  }

  const targets = resolveSeriesTargets(message, scope, history);
  const multiSeries = targets.length > 1;
  const intents = effectiveIntents(rawIntents, multiSeries);

  const lines = [
    `--- DATOS ACTUALES BEENGINE (temporada ${CURRENT_SEASON_YEAR}) ---`,
    multiSeries
      ? 'Resumen de las categorías solicitadas (datos sincronizados en BeEngine). Usa solo estos números y nombres.'
      : `Datos de ${SERIES_LABEL[targets[0]]}. Fuente autorizada para clasificación y calendario.`,
  ];
  const sources = targets.map((id) => ({
    slug: `live-${id}`,
    title: `Datos actuales ${SERIES_LABEL[id]}`,
  }));

  if (multiSeries) {
    const bundles = await Promise.all(
      targets.map(async (seriesId) => {
        const bundle = await fetchSeriesBundle(seriesId);
        return { seriesId, text: formatSeriesCompact(seriesId, bundle) };
      }),
    );
    for (const { text } of bundles) {
      lines.push(`\n${text}`);
    }
  } else {
    lines.push(`\n${await buildSingleSeriesDetail(targets[0], intents)}`);
  }

  if (rawIntents.driverLookup || /\b[A-Z][a-záéíóúñ]{3,}\b/.test(message)) {
    const driverBlock = await buildDriverLookupBlock(message);
    if (driverBlock) lines.push(driverBlock);
  }

  lines.push('--- FIN DATOS ACTUALES ---');

  let text = lines.join('\n');
  const maxChars = ASSIST_LIVE_MAX_CHARS;
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars)}\n… (recortado)`;
  }

  return { text, sources, used: true };
}
