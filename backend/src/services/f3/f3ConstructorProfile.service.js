import {
  buildFeederConstructorAggregates,
  buildFeederConstructorBio,
  buildFeederConstructorSeasonRows,
  buildFeederConstructorStats,
} from '../shared/feederProfile.shared.js';
import {
  findConstructorGrid,
  getCalendar,
  getConstructorStandings,
  getDriversForConstructor,
  getMaxCompletedRound,
  getRaceResultsByRound,
} from './f3Data.service.js';

export const getConstructorProfile = async (constructorId, _careerPage = 1) => {
  const grid = await findConstructorGrid(constructorId);
  if (!grid) throw new Error('Constructor not found');

  const standings = await getConstructorStandings();
  const row = standings.items.find((c) => c.constructorId === constructorId);
  const drivers = await getDriversForConstructor(constructorId);
  const calendar = await getCalendar();
  const maxRound = await getMaxCompletedRound();
  const gpLabel = (round) => {
    const race = calendar.items.find((c) => c.round === round);
    return race ? race.raceName.replace(/ Grand Prix$/i, '') : `Ronda ${round}`;
  };

  const currentSeason = await buildFeederConstructorSeasonRows(
    drivers,
    maxRound,
    gpLabel,
    getRaceResultsByRound,
  );

  let teamPodiums = 0;
  for (let r = 1; r <= maxRound; r += 1) {
    try {
      const race = await getRaceResultsByRound(r);
      for (const d of drivers) {
        const result = race.results.find((x) => x.driverId === d.driverId);
        if (result?.position <= 3) teamPodiums += 1;
      }
    } catch {
      /* skip */
    }
  }

  const careerRow = {
    year: 2026,
    wins: row?.wins ?? 0,
    podiums: teamPodiums,
    poles: 0,
    pts: row?.points ?? 0,
    pos: row?.pos ?? 0,
    standingsRound: maxRound,
    titleWon: false,
  };

  return {
    source: 'db',
    constructorId: grid.constructorId,
    name: grid.team,
    nationality: grid.nationality,
    wikiUrl: null,
    logoUrl: grid.logoUrl,
    bikeImageUrl: grid.bikeImageUrl,
    teamColor: grid.teamColor,
    currentSeasonYear: 2026,
    standing: row
      ? { pos: row.pos, points: row.points, wins: row.wins }
      : null,
    stats: buildFeederConstructorStats(row, teamPodiums),
    drivers,
    currentSeason,
    bioText: buildFeederConstructorBio(grid.team, grid.nationality, 'Fórmula 3', 2026),
    careerHistory: [careerRow],
    careerHistoryPagination: {
      page: 1,
      pageSize: 1,
      totalYears: 1,
      totalPages: 1,
      maxPts: row?.points ?? 1,
    },
  };
};

export const getConstructorProfileAggregates = async (constructorId) => {
  const profile = await getConstructorProfile(constructorId);
  return buildFeederConstructorAggregates(profile);
};
