import {
  findConstructorGrid,
  getCalendar,
  getConstructorStandings,
  getDriversForConstructor,
  getMaxCompletedRound,
  getRaceResultsByRound,
} from './f2Data.service.js';

export const getConstructorProfile = async (constructorId, _careerPage = 1) => {
  const grid = findConstructorGrid(constructorId);
  if (!grid) throw new Error('Constructor not found');

  const standings = await getConstructorStandings();
  const row = standings.items.find((c) => c.constructorId === constructorId);
  const drivers = getDriversForConstructor(constructorId);
  const calendar = await getCalendar();
  const maxRound = await getMaxCompletedRound();
  const gpLabel = (round) => {
    const race = calendar.items.find((c) => c.round === round);
    return race ? race.raceName.replace(/ Grand Prix$/i, '') : `Ronda ${round}`;
  };

  const currentSeason = [];
  for (let r = 1; r <= maxRound; r += 1) {
    let pts = 0;
    let bestPos = 99;
    for (const d of drivers) {
      try {
        const race = await getRaceResultsByRound(r);
        const result = race.results.find((x) => x.driverId === d.driverId);
        if (result) {
          pts += result.points;
          bestPos = Math.min(bestPos, result.position);
        }
      } catch {
        /* skip */
      }
    }
    if (pts > 0) {
      currentSeason.push({
        round: r,
        gp: gpLabel(r),
        pts,
        pos: bestPos < 99 ? bestPos : null,
      });
    }
  }

  return {
    constructorId: grid.constructorId,
    name: grid.team,
    nationality: grid.nationality,
    currentSeasonYear: 2026,
    championships: 0,
    stats: {
      wins: row?.wins ?? 0,
      podiums: 0,
      poles: 0,
      races: maxRound,
      points: row?.points ?? 0,
    },
    drivers: drivers.map((d) => ({
      driverId: d.driverId,
      givenName: d.givenName,
      familyName: d.familyName,
      nationality: d.nationality,
    })),
    currentSeason,
    careerHistory: [
      {
        year: 2026,
        team: grid.team,
        races: maxRound,
        wins: row?.wins ?? 0,
        podiums: 0,
        poles: 0,
        pts: row?.points ?? 0,
        pos: row?.pos ?? null,
        seasonComplete: false,
        titleWon: false,
      },
    ],
    careerHistoryPagination: null,
  };
};

export const getConstructorProfileAggregates = async (constructorId) => {
  const profile = await getConstructorProfile(constructorId);
  return {
    championships: 0,
    stats: profile.stats,
    debut: '2026',
    maxCareerPts: profile.stats.points,
    partial: false,
  };
};
