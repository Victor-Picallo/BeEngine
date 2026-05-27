import {
  MOTO2_CATEGORY_UUID,
  MOTO3_CATEGORY_UUID,
  MOTOGP_CATEGORY_UUID,
} from '../../external/motogp/pulselive.client.js';
import {
  getCalendar,
  getDriverStandings,
  getRaceResultsByRound,
} from './pulseLive.service.js';
import { findMoto2DriverGrid } from '../moto2/moto2Data.service.js';
import { findMoto3DriverGrid } from '../moto3/moto3Data.service.js';
import { toPublicMediaUrl } from '../../lib/supabaseStorage.js';
import {
  findRider,
  getRiderDetail,
  getRiderStats,
  getRiderStatisticsBySeason,
} from './motogpRiders.service.js';

const CATEGORY_META = {
  motogp: {
    pulseId: MOTOGP_CATEGORY_UUID,
    label: 'MotoGP',
    source: 'pulselive-motogp',
  },
  moto2: {
    pulseId: MOTO2_CATEGORY_UUID,
    label: 'Moto2',
    source: 'pulselive-moto2',
  },
  moto3: {
    pulseId: MOTO3_CATEGORY_UUID,
    label: 'Moto3',
    source: 'pulselive-moto3',
  },
};

const resolveCategoryId = (raw) =>
  raw === 'moto2' || raw === 'moto3' ? raw : 'motogp';

const countForCategory = (block, pulseId) => {
  const cats = block?.categories ?? [];
  const hit = cats.find((c) => c.category?.id === pulseId);
  return hit?.count ?? block?.total ?? 0;
};

const seasonMatchesCategory = (row, label) => {
  const c = String(row?.category || '').toLowerCase();
  const key = label.toLowerCase();
  return c.includes(key);
};

const debutYearFromStats = (stats, seasonRows, pulseId) => {
  const seasons = seasonRows
    .map((r) => parseInt(String(r.season), 10))
    .filter((y) => Number.isFinite(y));
  if (seasons.length) return String(Math.min(...seasons));
  const first = stats?.first_grand_prix?.find((x) => x.category?.id === pulseId);
  return first?.event?.season ? String(first.event.season) : String(new Date().getFullYear());
};

export const getDriverProfile = async (driverId, opts = {}) => {
  const categoryId = resolveCategoryId(opts.categoryId);
  const meta = CATEGORY_META[categoryId];
  const localGrid =
    categoryId === 'moto2'
      ? findMoto2DriverGrid(driverId)
      : categoryId === 'moto3'
        ? findMoto3DriverGrid(driverId)
        : null;

  const standings = await getDriverStandings(categoryId);
  const row = standings.items.find((d) => d.driverId === driverId);
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

  const categorySeasons = seasonStats.filter((s) => seasonMatchesCategory(s, meta.label));
  const currentYear = new Date().getFullYear();
  const currentSeasonYear =
    categorySeasons.find((s) => parseInt(s.season, 10) === currentYear)?.season != null
      ? currentYear
      : parseInt(categorySeasons[0]?.season ?? String(currentYear), 10) || currentYear;

  const totalRounds = calendar.items?.length ?? 22;
  const id = row?.driverId ?? rider?.id ?? driverId;
  const racePayloads = await Promise.all(
    Array.from({ length: totalRounds }, (_, i) =>
      getRaceResultsByRound(i + 1, 'race', categoryId).catch(() => null),
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

  const careerHistory = categorySeasons
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

  const championships = countForCategory(stats?.world_championship_wins, meta.pulseId);
  const careerWins = countForCategory(stats?.grand_prix_victories, meta.pulseId);
  const careerPodiums = stats?.podiums?.total ?? 0;
  const careerPoles = stats?.poles?.total ?? 0;

  const givenName = rider?.givenName ?? row?.driver?.split(' ').slice(0, -1).join(' ') ?? '';
  const familyName = rider?.familyName ?? row?.driver?.split(' ').pop() ?? '';

  return {
    source: meta.source,
    driverId: row?.driverId ?? rider?.id ?? driverId,
    givenName,
    familyName,
    code: (familyName || row?.driver || 'XXX').slice(0, 3).toUpperCase(),
    number: rider?.number ?? null,
    dateOfBirth: rider?.birthDate ?? null,
    nationality: rider?.nationality ?? row?.nationality ?? '',
    headshotUrl:
      toPublicMediaUrl(rider?.portraitUrl) ??
      toPublicMediaUrl(row?.headshotUrl) ??
      localGrid?.headshotUrl ??
      null,
    championships,
    debut: debutYearFromStats(stats, categorySeasons, meta.pulseId),
    currentSeasonYear,
    stats: {
      wins: careerWins || row?.wins || 0,
      podiums: careerPodiums,
      poles: careerPoles,
      fastestLaps: 0,
      races: categorySeasons.reduce((n, s) => n + (s.starts ?? 0), 0),
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

export const getDriverProfileAggregates = async (driverId, opts = {}) => {
  const profile = await getDriverProfile(driverId, opts);
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
