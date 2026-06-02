import { DB_ENABLED } from '../../config/env.js';
import { getNewsArticles } from '../shared/newsFeed.service.js';
import {
  buildContextText,
  detectMentionedSeries,
  historyMentionsSportsContext,
  normalizeQuery,
} from './assistIntent.util.js';

const NEWS_CATEGORIES = ['f1', 'f2', 'f3', 'motogp', 'moto2', 'moto3'];

const CATEGORY_LABEL = {
  f1: 'Formula 1',
  f2: 'Formula 2',
  f3: 'Formula 3',
  motogp: 'MotoGP',
  moto2: 'Moto2',
  moto3: 'Moto3',
};

const NEWS_MAX_CHARS = 4000;

/**
 * @param {string} message
 * @param {Array<{ role?: string, content?: string }>} history
 */
export function detectNewsIntent(message, history = []) {
  const m = normalizeQuery(message);
  const context = normalizeQuery(buildContextText(message, history));
  const news =
    /noticias?|news|titulares?|novedades|actualidad|rumor|rumores|headlines?|ultima\s+hora|que\s+pasa\s+en|enterarme\s+de/i.test(
      m,
    ) ||
    /noticias?|titulares?|rumor/i.test(context);
  if (news) return true;
  if (/^(y\s+)?(las\s+)?noticias/i.test(m) && historyMentionsSportsContext(history)) return true;
  return false;
}

/**
 * @param {string} message
 */
function wantsAllCategoriesNews(message) {
  const m = normalizeQuery(message);
  return /todas?|cada categor|las\s*6|todos los campeonatos|resumen de noticias|todas las noticias/i.test(m);
}

/**
 * @param {string} message
 * @param {string} scope
 * @param {Array<{ role?: string, content?: string }>} history
 */
function resolveNewsCategories(message, scope, history = []) {
  const inMsg = detectMentionedSeries(message);
  if (inMsg.length) return inMsg;
  if (wantsAllCategoriesNews(message)) return NEWS_CATEGORIES;
  const inCtx = detectMentionedSeries(buildContextText(message, history));
  if (inCtx.length) return inCtx;
  const s = String(scope || 'global').toLowerCase();
  if (NEWS_CATEGORIES.includes(s)) return [s];
  return NEWS_CATEGORIES;
}

/**
 * @param {{ scope?: string, message: string, history?: Array<{ role?: string, content?: string }> }} opts
 */
export async function buildNewsContext({ scope, message, history = [] }) {
  if (!DB_ENABLED || !detectNewsIntent(message, history)) {
    return { text: '', sources: [], used: false };
  }

  const categories = resolveNewsCategories(message, scope, history);
  const lines = [
    '--- NOTICIAS RECIENTES BEENGINE (RSS / base de datos) ---',
    'Titulares recientes. No inventes noticias que no aparezcan aquí.',
  ];
  const sources = [];

  const sections = await Promise.all(
    categories.map(async (cat) => {
      const label = CATEGORY_LABEL[cat] ?? cat;
      try {
        const { items } = await getNewsArticles(cat, { limit: 6 });
        if (!items?.length) {
          return { cat, label, body: 'Sin titulares disponibles.' };
        }
        const body = items
          .slice(0, 6)
          .map((a) => `- [${a.tag ?? 'NEWS'}] ${a.title}${a.time ? ` (${a.time})` : ''}`)
          .join('\n');
        return { cat, label, body };
      } catch {
        return { cat, label, body: 'No disponible.' };
      }
    }),
  );

  for (const { cat, label, body } of sections) {
    sources.push({ slug: `news-${cat}`, title: `Noticias ${label}` });
    lines.push(`\n### ${label}\n${body}`);
  }

  lines.push('--- FIN NOTICIAS ---');

  let text = lines.join('\n');
  if (text.length > NEWS_MAX_CHARS) {
    text = `${text.slice(0, NEWS_MAX_CHARS)}\n… (recortado)`;
  }

  return { text, sources, used: true };
}
