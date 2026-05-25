import { getNewsArticles, fetchOgImage } from './newsFeed.service.js';
import { resolveWinnerHeadshotUrl } from '../f1/driverMedia.js';
import { f1TeamCarImageUrl } from '../f1/teamMedia.js';

const MIN_SCORE_STRICT = 9;
const MIN_SCORE_OG = 7;

/**
 * @param {{ raceName: string, circuitName?: string }} race
 */
function raceSearchTerms(race) {
  const terms = new Set();
  const rn = (race.raceName || '').toLowerCase();
  rn.replace(/grand prix/gi, ' ').split(/\s+/).forEach((w) => {
    if (w.length > 2) terms.add(w);
  });
  (race.circuitName || '').toLowerCase().split(/\s+/).forEach((w) => {
    if (w.length > 3) terms.add(w);
  });
  return [...terms];
}

function textMentionsRace(text, terms) {
  const t = text.toLowerCase();
  return terms.some((term) => t.includes(term));
}

/**
 * @param {object} a
 * @param {object} race
 * @param {string} winnerLast
 * @param {string[]} terms
 */
function scoreArticle(a, race, winnerLast, terms) {
  const blob = `${a.title} ${a.excerpt || ''} ${a.url || ''}`;
  if (!textMentionsRace(blob, terms)) return 0;

  let score = 6;
  const lower = blob.toLowerCase();
  const url = (a.url || '').toLowerCase();

  if (winnerLast && lower.includes(winnerLast)) score += 5;
  if (a.tag === 'RESULTADOS') score += 3;
  if (/\b(win|wins|won|victory|podium|winner|gana|victoria|celebrat|chequered|dominat)\b/i.test(blob)) {
    score += 2;
  }
  if (a.source === 'Formula 1') score += 2;
  if (url.includes('formula1.com')) score += 1;
  if (terms.some((t) => url.includes(t))) score += 2;

  const hasWinner = Boolean(winnerLast && lower.includes(winnerLast));
  const officialRaceReport =
    a.source === 'Formula 1' &&
    (a.tag === 'RESULTADOS' ||
      /\b(win|victory|won|podium|race result|gp report|grand prix|post-race)\b/i.test(blob));

  if (!hasWinner && !officialRaceReport && score < MIN_SCORE_OG + 2) return 0;
  return score;
}

/**
 * @param {object} race
 * @param {object[]} items
 * @param {number} minScore
 */
function pickBestWithImage(items, race, minScore) {
  const winner = race.results?.find((r) => r.position === 1);
  const winnerLast = winner?.driver?.split(/\s+/).pop()?.toLowerCase() ?? '';
  const terms = raceSearchTerms(race);
  let best = null;

  for (const a of items) {
    if (!a.imageUrl) continue;
    const score = scoreArticle(a, race, winnerLast, terms);
    if (score < minScore) continue;
    if (!best || score > best.score) best = { url: a.imageUrl, score };
  }
  return best?.url ?? null;
}

/**
 * @param {object} race
 * @param {object[]} items
 */
async function pickBestOgImage(race, items) {
  const winner = race.results?.find((r) => r.position === 1);
  const winnerLast = winner?.driver?.split(/\s+/).pop()?.toLowerCase() ?? '';
  const terms = raceSearchTerms(race);

  const candidates = items
    .filter((a) => a.url)
    .map((a) => ({ a, score: scoreArticle(a, race, winnerLast, terms) }))
    .filter((x) => x.score >= MIN_SCORE_OG)
    .sort((x, y) => y.score - x.score)
    .slice(0, 8);

  for (const { a } of candidates) {
    const img = a.imageUrl || (await fetchOgImage(a.url));
    if (img) return img;
  }
  return null;
}

/**
 * Imagen 100 % ligada al último GP: crónica RSS → og:article → retrato ganador → monoplaza equipo.
 * @param {{ raceName: string, circuitName?: string, results?: object[] }} race
 * @returns {Promise<string | null>}
 */
export async function resolveLastRaceImageUrl(race) {
  if (!race?.raceName) return null;

  const winner = race.results?.find((r) => r.position === 1);

  let items = [];
  try {
    ({ items } = await getNewsArticles('f1', { tag: 'Todos', limit: 60, offset: 0 }));
  } catch {
    items = [];
  }

  const fromRss = pickBestWithImage(race, items, MIN_SCORE_STRICT);
  if (fromRss) return fromRss;

  const fromOg = await pickBestOgImage(race, items);
  if (fromOg) return fromOg;

  if (winner) {
    const headshot = await resolveWinnerHeadshotUrl(winner);
    if (headshot) return headshot;

    const constructorId = winner.constructorId;
    const car = f1TeamCarImageUrl(constructorId);
    if (car) return car;
  }

  return null;
}
