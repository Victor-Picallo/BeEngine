import { requirePrisma } from '../../lib/prisma.js';
import { DB_ENABLED } from '../../config/env.js';

const mapRow = (row) => ({
  id: row.id,
  cat: row.category,
  tag: row.tag ?? 'ANÁLISIS',
  hot: row.hot,
  title: row.title,
  excerpt: row.summary ?? row.title,
  author: row.category,
  source: row.category,
  time: row.pubDate
    ? row.pubDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    : 'Reciente',
  readTime: '3 min',
  featured: row.hot,
  imageUrl: row.imageUrl,
  url: row.link,
  publishedAt: row.pubDate?.toISOString() ?? null,
});

/**
 * @param {string} category
 * @param {{ tag?: string, limit?: number, offset?: number }} opts
 */
export async function getNewsArticlesFromDb(category, opts = {}) {
  if (!DB_ENABLED) return null;
  const prisma = requirePrisma();

  const tag = opts.tag ?? 'Todos';
  const limit = Math.min(60, Math.max(1, parseInt(String(opts.limit ?? '30'), 10) || 30));
  const offset = Math.max(0, parseInt(String(opts.offset ?? '0'), 10) || 0);

  const where = { category };
  if (tag && tag !== 'Todos') where.tag = tag.toUpperCase();

  const [rows, total] = await Promise.all([
    prisma.newsArticle.findMany({
      where,
      orderBy: { pubDate: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.newsArticle.count({ where }),
  ]);

  if (!rows.length) return null;

  return {
    items: rows.map(mapRow),
    total,
    category,
    tag,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    source: 'db',
  };
}

/**
 * @param {string} category
 * @param {number} limit
 */
export async function getNewsSummaryFromDb(category, limit = 4) {
  const res = await getNewsArticlesFromDb(category, { limit, offset: 0, tag: 'Todos' });
  return res?.items ?? null;
}
