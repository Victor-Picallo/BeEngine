import { fetchFiaPageData } from '../../external/fia/fiaNextData.client.js';
import {
  buildDriverResolver,
  buildTeamResolver,
  normalizeFeederCalendar,
  normalizeDriverStandings,
  normalizeConstructorStandings,
  normalizeFeatureRaceResults,
  findLastCompletedRound,
} from './fiaFeeder.mapper.js';

/**
 * @typedef {object} FeederSeriesConfig
 * @property {string} baseUrl
 * @property {number} [seasonId]
 * @property {object[]} driversGrid
 * @property {object[]} constructorsGrid
 * @property {object[]} [localCalendar] solo para fallback en f2Data/f3Data
 */

/**
 * @param {FeederSeriesConfig} config
 */
export const createFiaFeederApi = (config) => {
  const resolveDriverId = buildDriverResolver(config.driversGrid);
  const resolveConstructorId = buildTeamResolver(config.constructorsGrid);

  const fetchCalendarPage = () => fetchFiaPageData(config.baseUrl, '/Calendar');
  const fetchDriverStandingsPage = () =>
    fetchFiaPageData(config.baseUrl, config.seasonId ? `/Standings/Driver?seasonId=${config.seasonId}` : '/Standings/Driver');
  const fetchTeamStandingsPage = () =>
    fetchFiaPageData(config.baseUrl, config.seasonId ? `/Standings/Team?seasonId=${config.seasonId}` : '/Standings/Team');
  const fetchResultsPage = (raceId) =>
    fetchFiaPageData(config.baseUrl, `/Results?raceid=${raceId}`);

  const getCalendar = async () => {
    const pageData = await fetchCalendarPage();
    const items = normalizeFeederCalendar(pageData);
    return { items, raceIdByRound: Object.fromEntries(items.map((r) => [r.round, r.fiaRaceId])) };
  };

  const getDriverStandings = async () => {
    const pageData = await fetchDriverStandingsPage();
    const items = normalizeDriverStandings(pageData, resolveDriverId, config.driversGrid);
    return { items };
  };

  const getConstructorStandings = async () => {
    const pageData = await fetchTeamStandingsPage();
    const items = normalizeConstructorStandings(pageData, resolveConstructorId, config.constructorsGrid);
    return { items };
  };

  const getRaceResultsByRound = async (round) => {
    const { items } = await getCalendar();
    const race = items.find((r) => r.round === round);
    if (!race?.fiaRaceId) throw new Error(`No FIA race id for round ${round}`);
    const pageData = await fetchResultsPage(race.fiaRaceId);
    return normalizeFeatureRaceResults(pageData, resolveDriverId, resolveConstructorId);
  };

  const getLastRace = async () => {
    const { items } = await getCalendar();
    const last = findLastCompletedRound(items);
    if (!last) throw new Error('No completed feeder race on FIA');
    const race = await getRaceResultsByRound(last.round);
    return race;
  };

  return {
    getCalendar,
    getDriverStandings,
    getConstructorStandings,
    getRaceResultsByRound,
    getLastRace,
  };
};
