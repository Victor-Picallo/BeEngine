import {
  getCalendar,
  getConstructorStandings,
  getRaceResultsByRound,
  getCurrentSeasonYear,
} from '../motogpPulseLive.service.js';
import { resolveMotogpTeamLogoUrl } from '../../data/motogpTeamLogos.js';
import {
  createDynamicTeamProfileDef,
  getMotogpTeamProfileDef,
  teamSlugMatchesProfile,
} from '../../data/motogpTeamProfiles.js';
import { getManufacturerHistorical } from '../../data/motogpManufacturerHistorical.js';
import {
  buildTeamCareerHistory,
  buildTeamLifetimeStats,
  statsFromCareerHistory,
} from './motogpTeamCareer.service.js';
import { findTeam, getTeamsIndex } from './motogpTeams.service.js';

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const gpShortName = (raceName) =>
  String(raceName || '')
    .replace(/ Grand Prix$/i, '')
    .replace(/^.* of /i, '')
    .trim();

/** Pulse Live etiqueta `constructorId` en carrera como fabricante; el equipo va en `team`. */
const raceResultMatchesTeam = (res, cid, profileDef) => {
  const teamSlug = slugify(res.team);
  const key = slugify(cid);
  if (teamSlug && teamSlug === key) return true;
  if (profileDef && teamSlug) return teamSlugMatchesProfile(teamSlug, profileDef);
  return false;
};

export const getConstructorProfile = async (constructorId, opts = {}) => {
  const careerPage = Math.max(1, parseInt(String(opts.careerPage ?? '1'), 10) || 1);
  const seasonYear = await getCurrentSeasonYear();
  const profileDef = getMotogpTeamProfileDef(constructorId);
  const teamRow = await findTeam(constructorId, seasonYear);
  const standingRow =
    (await getConstructorStandings()).items.find(
      (c) =>
        c.constructorId === (teamRow?.constructorId ?? constructorId) ||
        c.constructorId === profileDef?.constructorId,
    ) ?? null;

  if (!teamRow && !standingRow && !profileDef) {
    const err = new Error('Constructor not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const team = teamRow ?? (await findTeam(standingRow?.team, seasonYear));
  const cid = team?.constructorId ?? standingRow?.constructorId ?? constructorId;
  const def =
    getMotogpTeamProfileDef(cid) ??
    profileDef ??
    (team ? createDynamicTeamProfileDef(cid, team.name) : null);

  const calendar = await getCalendar();
  const totalRounds = calendar.items?.length ?? 22;
  const currentSeason = [];
  let cumPts = 0;
  let seasonPodiums = 0;
  let seasonPoles = 0;

  const racePayloads = await Promise.all(
    Array.from({ length: totalRounds }, (_, i) =>
      getRaceResultsByRound(i + 1).catch(() => null),
    ),
  );

  for (const race of racePayloads) {
    if (!race) continue;
    const teamResults = (race.results ?? []).filter((res) =>
      raceResultMatchesTeam(res, cid, def),
    );
    if (!teamResults.length) continue;

    const sorted = [...teamResults].sort((a, b) => a.position - b.position);
    const pts = sorted.reduce((s, x) => s + (Number(x.points) || 0), 0);
    const bestPos = sorted[0]?.position ?? 99;
    cumPts += pts;

    for (const r of sorted) {
      if (r.position <= 3) seasonPodiums += 1;
      if (r.grid === 1) seasonPoles += 1;
    }

    const d1 = sorted[0];
    const d2 = sorted[1];
    currentSeason.push({
      round: race.round,
      gp: gpShortName(race.raceName),
      d1Pos: d1?.position ?? null,
      d2Pos: d2?.position ?? null,
      pts,
      pos: bestPos,
      points: pts,
      cumPts,
    });
  }

  const drivers =
    team?.riders?.length
      ? team.riders.map((r) => ({
          driverId: r.driverId,
          givenName: r.givenName,
          familyName: r.familyName,
          code: (r.familyName || 'XXX').slice(0, 3).toUpperCase(),
          number: r.number,
          nationality: r.nationality,
          headshotUrl: r.headshotUrl,
        }))
      : [];

  const career = def
    ? await buildTeamCareerHistory(cid, seasonYear, careerPage)
    : { items: [], careerHistoryPagination: null };
  let careerHistory = career.items ?? [];
  let careerHistoryPagination = career.careerHistoryPagination ?? null;

  const patchCurrentYear =
    careerPage === 1 || careerHistory.some((h) => h.year === seasonYear);
  if (patchCurrentYear) {
    const currentYearRow = careerHistory.find((h) => h.year === seasonYear);
    if (currentYearRow) {
      currentYearRow.podiums = seasonPodiums;
      currentYearRow.poles = seasonPoles;
      currentYearRow.races = currentSeason.length;
      currentYearRow.wins = standingRow?.wins ?? currentYearRow.wins;
      currentYearRow.pts = standingRow?.points ?? currentYearRow.pts;
      currentYearRow.pos = standingRow?.pos ?? currentYearRow.pos;
      currentYearRow.seasonComplete = false;
      currentYearRow.titleWon = false;
    } else if (standingRow && careerPage === 1) {
      careerHistory.unshift({
        year: seasonYear,
        name: team?.name ?? standingRow.team ?? def?.name ?? '—',
        races: currentSeason.length,
        wins: standingRow.wins ?? 0,
        podiums: seasonPodiums,
        poles: seasonPoles,
        pts: standingRow.points ?? 0,
        pos: standingRow.pos ?? null,
        seasonComplete: false,
        titleWon: false,
      });
    }
  }

  const baseStats = def
    ? statsFromCareerHistory(careerHistory, def)
    : {
        championships: 0,
        championshipYears: [],
        totalWins: standingRow?.wins ?? 0,
        totalPodiums: seasonPodiums,
        totalPoles: seasonPoles,
      };

  const stats = {
    ...baseStats,
    totalPodiums: Math.max(baseStats.totalPodiums, seasonPodiums),
    totalWins: Math.max(baseStats.totalWins, standingRow?.wins ?? 0),
  };

  const MFR_LABEL = {
    honda: 'Honda',
    yamaha: 'Yamaha',
    ducati: 'Ducati',
    aprilia: 'Aprilia',
    ktm: 'KTM',
    suzuki: 'Suzuki',
  };
  const linkedMfr = def?.linkedManufacturerSlug
    ? getManufacturerHistorical(def.linkedManufacturerSlug)
    : null;
  const linkedManufacturer = linkedMfr
    ? {
        slug: def.linkedManufacturerSlug,
        name: MFR_LABEL[def.linkedManufacturerSlug] ?? def.linkedManufacturerSlug,
        championships: linkedMfr.championships,
        championshipYears: [...linkedMfr.championshipYears].sort((a, b) => b - a),
        totalWins: linkedMfr.totalWins,
      }
    : null;

  const needsLifetimeAggregates = Boolean(def && !def.manufacturerSlug);
  const aggregatesPending = needsLifetimeAggregates;

  const displayName = team?.name ?? standingRow?.team ?? def?.name ?? '—';

  return {
    source: 'pulselive-motogp',
    constructorId: cid,
    teamId: team?.teamId ?? standingRow?.teamId ?? null,
    name: displayName,
    nationality: def?.nationality ?? standingRow?.nationality ?? '',
    wikiUrl: def?.wikiUrl ?? null,
    logoUrl:
      team?.logoUrl ??
      standingRow?.logoUrl ??
      resolveMotogpTeamLogoUrl(
        team?.teamId ?? standingRow?.teamId,
        cid,
        displayName,
      ) ??
      null,
    bikeImageUrl: team?.bikeImageUrl ?? null,
    teamColor: team?.color ?? standingRow?.teamColor ?? null,
    currentSeasonYear: seasonYear,
    standing: standingRow
      ? {
          pos: standingRow.pos,
          points: standingRow.points,
          wins: standingRow.wins ?? 0,
        }
      : null,
    stats,
    drivers,
    currentSeason,
    careerHistory,
    bioText: def?.bioText ?? '',
    careerHistoryPagination,
    careerHistoryError: null,
    historyScope: def?.manufacturerSlug ? 'manufacturer' : 'team',
    statsSource: def?.manufacturerSlug ? 'historical+pulselive' : 'pulselive',
    linkedManufacturer,
    aggregatesPending,
    aggregatesError: false,
  };
};

export const getConstructorProfileAggregates = async (constructorId) => {
  const seasonYear = await getCurrentSeasonYear();
  const profile = await getConstructorProfile(constructorId, { careerPage: 1 });
  const def = getMotogpTeamProfileDef(profile.constructorId);

  if (def?.manufacturerSlug) {
    const hist = getManufacturerHistorical(def.manufacturerSlug);
    return {
      stats: profile.stats,
      bioText: profile.bioText,
      maxCareerPts:
        profile.careerHistoryPagination?.maxPts ??
        hist?.maxCareerPts ??
        profile.standing?.points ??
        1,
      partial: false,
    };
  }

  if (!def) {
    return {
      stats: profile.stats,
      bioText: profile.bioText,
      maxCareerPts: profile.standing?.points ?? 1,
      partial: false,
    };
  }

  const lifetime = await buildTeamLifetimeStats(def, seasonYear);
  const stats = statsFromCareerHistory(profile.careerHistory, def, lifetime);
  const maxCareerPts = Math.max(
    lifetime?.maxCareerPts ?? 1,
    profile.careerHistoryPagination?.maxPts ?? 1,
    ...profile.careerHistory.map((h) => h.pts),
    profile.standing?.points ?? 0,
  );

  return {
    stats,
    bioText: profile.bioText,
    maxCareerPts,
    partial: false,
  };
};
