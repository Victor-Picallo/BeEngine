import { DB_ENABLED } from '../../config/env.js';
import {
  getCalendarFromDb,
  getDriverStandingsFromDb,
} from '../../repositories/db/feeder.repository.js';
import { getNewsArticlesFromDb } from '../../repositories/db/newsArticle.repository.js';

const SERIES_IDS = ['f1', 'f2', 'f3', 'motogp', 'moto2', 'moto3'];

const emptySeries = () => ({ standings: [], calendar: [] });

/**
 * Payload agregado para la landing: solo Prisma, sin APIs externas.
 */
export async function getLandingFromDb() {
  if (!DB_ENABLED) {
    return {
      source: 'empty',
      series: Object.fromEntries(SERIES_IDS.map((id) => [id, emptySeries()])),
      news: [],
    };
  }

  const seriesPairs = await Promise.all(
    SERIES_IDS.map(async (id) => {
      const [standings, calendar] = await Promise.all([
        getDriverStandingsFromDb(id).catch(() => null),
        getCalendarFromDb(id).catch(() => null),
      ]);
      return [
        id,
        {
          standings: Array.isArray(standings) ? standings : [],
          calendar: Array.isArray(calendar) ? calendar : [],
        },
      ];
    }),
  );

  const [f1NewsRes, motogpNewsRes] = await Promise.all([
    getNewsArticlesFromDb('f1', { limit: 4, tag: 'Todos' }).catch(() => null),
    getNewsArticlesFromDb('motogp', { limit: 2, tag: 'Todos' }).catch(() => null),
  ]);

  const news = [
    ...(f1NewsRes?.items ?? []),
    ...(motogpNewsRes?.items ?? []),
  ].slice(0, 6);

  return {
    source: 'db',
    series: Object.fromEntries(seriesPairs),
    news,
  };
}
