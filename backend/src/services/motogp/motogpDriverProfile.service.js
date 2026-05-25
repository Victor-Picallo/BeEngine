import {
  getCalendar,
  getDriverStandings,
  getRaceResultsByRound,
} from './pulseLive.service.js';
import {
  findRider,
  getRiderDetail,
  getRiderStats,
  getRiderStatisticsBySeason,
} from './motogpRiders.service.js';

const mgpCategoryId = 'e8c110ad-64aa-4e8e-8a86-f2f152f6a942';

const countMgp = (block) => {
  const cats = block?.categories ?? [];
  const mgp = cats.find((c) => c.category?.id === mgpCategoryId);
  return mgp?.count ?? block?.total ?? 0;
};

const debutYearFromStats = (stats, seasonRows) => {
  const seasons = seasonRows
    .map((r) => parseInt(String(r.season), 10))
    .filter((y) => Number.isFinite(y));
  if (seasons.length) return String(Math.min(...seasons));
  const first = stats?.first_grand_prix?.find(
    (x) => x.category?.id === mgpCategoryId,
  );
  return first?.event?.season ? String(first.event.season) : String(new Date().getFullYear());
};

export const getDriverProfile = async (driverId) => {
  const row = (await getDriverStandings()).items.find((d) => d.driverId === driverId);
  const rider = (await findRider(driverId)) ?? (await getRiderDetail(driverId));
  if (!row && !rider) {
    const err = new Error('Driver not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const legacyId = rider?.legacyId;
  const [stats, seasonStats, calendar] = await Promise.all([
    legacyId ? getRiderStats(legacyId).catch(() => null) : Promise.resolve(null),
    legacyId ? getRiderStatisticsBySeason(legacyId).catch(() => []) : Promise.resolve([]),
    getCalendar(),
  ]);

  const mgpSeasons = seasonStats.filter(
    (s) => String(s.category || '').includes('MotoGP'),
  );
  const currentYear = new Date().getFullYear();
  const currentSeasonYear =
    mgpSeasons.find((s) => parseInt(s.season, 10) === currentYear)?.season != null
      ? currentYear
      : parseInt(mgpSeasons[0]?.season ?? String(currentYear), 10) || currentYear;

  const totalRounds = calendar.items?.length ?? 22;
  const id = row?.driverId ?? rider?.id ?? driverId;
  const racePayloads = await Promise.all(
    Array.from({ length: totalRounds }, (_, i) =>
      getRaceResultsByRound(i + 1).catch(() => null),
    ),
  );
  const currentSeason = racePayloads
    .filter(Boolean)
    .map((race) => {
      const result = race.results?.find((x) => x.driverId === id);
      if (!result) return null;
      return {
        round: race.round,
        gp: race.raceName.replace(/ Grand Prix$/i, '').replace(/^.* of /i, ''),
        grid: 0,
        pos: result.position,
        pts: result.points,
        gap: result.position === 1 ? '—' : `P${result.position}`,
        laps: 0,
        fl: false,
        teamName: result.team,
      };
    })
    .filter(Boolean);

  const careerHistory = mgpSeasons
    .map((s) => {
      const year = parseInt(s.season, 10);
      if (!Number.isFinite(year)) return null;
      const complete = year < currentYear;
      return {
        year,
        team: s.constructor ?? row?.team ?? rider?.team ?? '—',
        races: s.starts ?? 0,
        wins: s.first_position ?? 0,
        podiums: s.podiums ?? 0,
        poles: s.poles ?? 0,
        pts: s.points ?? 0,
        pos: s.position ?? null,
        seasonComplete: complete,
        titleWon: complete && s.position === 1,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.year - a.year);

  const championships = countMgp(stats?.world_championship_wins);
  const careerWins = countMgp(stats?.grand_prix_victories);
  const careerPodiums = stats?.podiums?.total ?? 0;
  const careerPoles = stats?.poles?.total ?? 0;

  const givenName = rider?.givenName ?? row?.driver?.split(' ').slice(0, -1).join(' ') ?? '';
  const familyName = rider?.familyName ?? row?.driver?.split(' ').pop() ?? '';

  return {
    source: 'pulselive-motogp',
    driverId: row?.driverId ?? rider?.id ?? driverId,
    givenName,
    familyName,
    code: (familyName || row?.driver || 'XXX').slice(0, 3).toUpperCase(),
    number: rider?.number ?? null,
    dateOfBirth: rider?.birthDate ?? null,
    nationality: rider?.nationality ?? row?.nationality ?? '',
    headshotUrl: rider?.portraitUrl ?? row?.headshotUrl ?? null,
    championships,
    debut: debutYearFromStats(stats, mgpSeasons),
    currentSeasonYear,
    stats: {
      wins: careerWins || row?.wins || 0,
      podiums: careerPodiums,
      poles: careerPoles,
      fastestLaps: 0,
      races: mgpSeasons.reduce((n, s) => n + (s.starts ?? 0), 0),
      points: row?.points ?? careerHistory[0]?.pts ?? 0,
      winsCurrentSeason: row?.wins ?? currentSeason.filter((x) => x.pos === 1).length,
    },
    currentSeason,
    careerHistory: careerHistory.length
      ? careerHistory
      : [
          {
            year: currentSeasonYear,
            team: row?.team ?? rider?.team ?? '—',
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
    statsSource: 'pulselive',
  };
};

export const getDriverProfileAggregates = async (driverId) => {
  const profile = await getDriverProfile(driverId);
  const maxCareerPts = profile.careerHistory.length
    ? Math.max(...profile.careerHistory.map((r) => r.pts))
    : profile.stats.points;
  return {
    championships: profile.championships,
    stats: profile.stats,
    debut: profile.debut,
    maxCareerPts,
    partial: false,
  };
};
