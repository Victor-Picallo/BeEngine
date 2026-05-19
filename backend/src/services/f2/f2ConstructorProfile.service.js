import {
  findConstructorGrid,
  getConstructorStandings,
  getDriversForConstructor,
  getRaceResultsByRound,
} from './f2Data.service.js';
import { F2_LAST_COMPLETED_ROUND } from '../../data/f2/f2Calendar2026.js';

export const getConstructorProfile = async (constructorId, _careerPage = 1) => {
  const grid = findConstructorGrid(constructorId);
  if (!grid) throw new Error('Constructor not found');

  const standings = await getConstructorStandings();
  const row = standings.items.find((c) => c.constructorId === constructorId);
  const drivers = getDriversForConstructor(constructorId);

  const currentSeason = [];
  for (let r = 1; r <= F2_LAST_COMPLETED_ROUND; r += 1) {
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
        gp: `Ronda ${r}`,
        pts,
        pos: bestPos < 99 ? bestPos : null,
      });
    }
  }

  return {
    source: 'beengine-f2',
    constructorId: grid.constructorId,
    name: grid.team,
    nationality: grid.nationality,
    currentSeasonYear: 2026,
    championships: 0,
    stats: {
      wins: row?.wins ?? 0,
      podiums: 0,
      poles: 0,
      races: F2_LAST_COMPLETED_ROUND,
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
        races: F2_LAST_COMPLETED_ROUND,
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
