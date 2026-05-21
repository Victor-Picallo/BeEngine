import {
  getCalendar,
  getConstructorStandings,
  getRaceResultsByRound,
  getCurrentSeasonYear,
} from '../motogpPulseLive.service.js';
import { findTeam, getTeamsIndex } from './motogpTeams.service.js';

export const getConstructorProfile = async (constructorId) => {
  const seasonYear = await getCurrentSeasonYear();
  const teamRow = await findTeam(constructorId, seasonYear);
  const standingRow =
    (await getConstructorStandings()).items.find(
      (c) => c.constructorId === (teamRow?.constructorId ?? constructorId),
    ) ?? null;

  if (!teamRow && !standingRow) {
    const err = new Error('Constructor not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const team = teamRow ?? (await findTeam(standingRow.team, seasonYear));
  const calendar = await getCalendar();
  const totalRounds = calendar.items?.length ?? 22;
  const currentSeason = [];
  let cumPts = 0;
  const cid = team?.constructorId ?? standingRow?.constructorId ?? constructorId;

  const racePayloads = await Promise.all(
    Array.from({ length: totalRounds }, (_, i) =>
      getRaceResultsByRound(i + 1).catch(() => null),
    ),
  );
  for (const race of racePayloads) {
    if (!race) continue;
    const teamResults = (race.results ?? []).filter((res) => res.constructorId === cid);
    if (!teamResults.length) continue;
    const pts = teamResults.reduce((s, x) => s + (Number(x.points) || 0), 0);
    const bestPos = Math.min(...teamResults.map((x) => x.position));
    cumPts += pts;
    currentSeason.push({
      round: race.round,
      gp: race.raceName.replace(/ Grand Prix$/i, '').replace(/^.* of /i, ''),
      pts,
      pos: bestPos,
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

  return {
    source: 'pulselive-motogp',
    constructorId: cid,
    name: team?.name ?? standingRow?.team ?? '—',
    nationality: standingRow?.nationality ?? '',
    wikiUrl: null,
    logoUrl: team?.logoUrl ?? standingRow?.logoUrl ?? null,
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
    stats: {
      championships: 0,
      totalWins: standingRow?.wins ?? 0,
      totalPodiums: 0,
      totalPoles: 0,
    },
    drivers,
    currentSeason,
    careerHistory: [
      {
        year: seasonYear,
        name: team?.name ?? standingRow?.team ?? '—',
        races: currentSeason.length,
        wins: standingRow?.wins ?? 0,
        podiums: 0,
        poles: 0,
        pts: standingRow?.points ?? 0,
        pos: standingRow?.pos ?? null,
        seasonComplete: false,
        titleWon: false,
      },
    ],
    bioText: '',
    careerHistoryPagination: null,
    statsSource: 'pulselive',
  };
};

export const getConstructorProfileAggregates = async (constructorId) => {
  const profile = await getConstructorProfile(constructorId);
  return {
    stats: profile.stats,
    bioText: '',
    maxCareerPts: profile.standing?.points ?? 0,
    partial: false,
  };
};
