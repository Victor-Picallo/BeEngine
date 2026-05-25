import { jolpicaClient } from '../../external/jolpica/jolpica.client.js';
import {
  getManualConstructorDef,
  isManualConstructorId,
} from '../../data/f1/f1ManualConstructors.js';

const PROFILE_JOLPICA = { timeoutMs: 10_000 };

async function fetchCurrentSeasonYear() {
  try {
    const raw = await jolpicaClient.get('/current/races.json', PROFILE_JOLPICA);
    const y = parseInt(raw?.MRData?.RaceTable?.season ?? String(new Date().getUTCFullYear()), 10);
    return Number.isFinite(y) ? y : new Date().getUTCFullYear();
  } catch {
    return new Date().getUTCFullYear();
  }
}

async function fetchStandingFromJolpicaIfPresent(constructorId) {
  try {
    const raw = await jolpicaClient.get('/current/constructorStandings.json', PROFILE_JOLPICA);
    const list =
      raw?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? [];
    const id = constructorId.toLowerCase();
    const hit = list.find(
      (cs) => String(cs.Constructor?.constructorId || '').toLowerCase() === id,
    );
    if (!hit) return null;
    return {
      pos: parseInt(hit.position, 10),
      points: parseFloat(hit.points),
      wins: parseInt(hit.wins ?? '0', 10),
    };
  } catch {
    return null;
  }
}

function buildDebutCareerRow(year, standing) {
  return {
    year,
    wins: standing?.wins ?? 0,
    podiums: 0,
    poles: 0,
    pts: standing?.points ?? 0,
    pos: standing?.pos ?? 0,
    standingsRound: 0,
    titleWon: false,
  };
}

function buildManualProfilePayload(def, seasonYear, standing) {
  const careerRow = buildDebutCareerRow(seasonYear, standing);
  const maxPts = Math.max(1, careerRow.pts);

  return {
    source: 'manual',
    constructorId: def.constructorId,
    name: def.name,
    nationality: def.nationality,
    wikiUrl: def.wikiUrl,
    currentSeasonYear: seasonYear,
    standing,
    stats: {
      championships: 0,
      totalWins: 0,
      totalPodiums: 0,
      totalPoles: 0,
    },
    bioText: def.bioText,
    drivers: def.drivers.map((d) => ({ ...d })),
    currentSeason: [],
    careerHistory: [careerRow],
    careerHistoryPagination: null,
    careerHistoryError: false,
    aggregatesPending: false,
  };
}

export { isManualConstructorId };

export async function getManualConstructorProfile(rawConstructorId) {
  const constructorId = String(rawConstructorId || '').trim().toLowerCase();
  const def = getManualConstructorDef(constructorId);
  if (!def) {
    const err = new Error('Constructor no encontrado');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const seasonYear = await fetchCurrentSeasonYear();
  const fromApi = await fetchStandingFromJolpicaIfPresent(constructorId);
  const standing =
    fromApi ??
    (def.standingFallback
      ? {
          pos: def.standingFallback.pos,
          points: def.standingFallback.points,
          wins: def.standingFallback.wins,
        }
      : null);

  return buildManualProfilePayload(def, seasonYear, standing);
}

export async function getManualConstructorProfileAggregates(rawConstructorId) {
  const constructorId = String(rawConstructorId || '').trim().toLowerCase();
  const def = getManualConstructorDef(constructorId);
  if (!def) {
    const err = new Error('Constructor no encontrado');
    err.code = 'NOT_FOUND';
    throw err;
  }

  return {
    stats: {
      championships: 0,
      totalWins: 0,
      totalPodiums: 0,
      totalPoles: 0,
    },
    bioText: def.bioText,
    maxCareerPts: 1,
  };
}
