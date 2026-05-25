import {
  findDriverGrid,
  getDriverStandings,
  getMaxCompletedRound,
  getRaceResultsByRound,
} from './f2Data.service.js';

const splitName = (driver) => {
  const parts = driver.driver.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { givenName: parts[0] ?? '', familyName: '' };
  }
  return {
    givenName: parts.slice(0, -1).join(' '),
    familyName: parts[parts.length - 1],
  };
};

export const getDriverProfile = async (driverId, _careerPage = 1) => {
  const grid = findDriverGrid(driverId);
  if (!grid) throw new Error('Driver not found');

  const standings = await getDriverStandings();
  const row = standings.items.find((d) => d.driverId === driverId);

  const maxRound = await getMaxCompletedRound();
  const currentSeason = [];
  for (let r = 1; r <= maxRound; r += 1) {
    try {
      const race = await getRaceResultsByRound(r);
      const result = race.results.find((x) => x.driverId === driverId);
      if (!result) continue;
      currentSeason.push({
        round: race.round,
        gp: race.raceName.replace(/ Grand Prix$/i, ''),
        grid: result.grid,
        pos: result.position,
        pts: result.points,
        gap: result.position === 1 ? '—' : `+${result.position - 1}`,
        laps: result.laps,
        fl: false,
        teamName: result.team,
      });
    } catch {
      /* skip */
    }
  }

  const { givenName, familyName } = splitName(grid);

  return {
    driverId: grid.driverId,
    givenName,
    familyName,
    code: familyName.slice(0, 3).toUpperCase(),
    number: null,
    dateOfBirth: null,
    nationality: grid.nationality,
    championships: 0,
    debut: '2026',
    currentSeasonYear: 2026,
    stats: {
      wins: row?.wins ?? 0,
      podiums: currentSeason.filter((x) => x.pos <= 3).length,
      poles: 0,
      fastestLaps: 0,
      races: currentSeason.length,
      points: row?.points ?? 0,
      winsCurrentSeason: row?.wins ?? 0,
    },
    currentSeason,
    careerHistory: [
      {
        year: 2026,
        team: grid.team,
        races: currentSeason.length,
        wins: row?.wins ?? 0,
        podiums: currentSeason.filter((x) => x.pos <= 3).length,
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

export const getDriverProfileAggregates = async (driverId) => {
  const profile = await getDriverProfile(driverId);
  return {
    championships: 0,
    stats: profile.stats,
    debut: profile.debut,
    maxCareerPts: profile.stats.points,
    partial: false,
  };
};
