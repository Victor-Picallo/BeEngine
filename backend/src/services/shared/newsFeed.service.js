import { createHash } from 'node:crypto';
import { parseRssItems } from '../../utils/rssParser.js';
import { NEWS_FEEDS_BY_CATEGORY } from '../../data/shared/newsFeeds.config.js';
import { DB_ENABLED } from '../../config/env.js';
import {
  getNewsArticlesFromDb,
  getNewsSummaryFromDb,
} from '../../repositories/db/newsArticle.repository.js';

const CACHE_MS = Math.max(
  60_000,
  parseInt(process.env.NEWS_FEED_CACHE_MS || String(5 * 60 * 1000), 10),
);
const FETCH_TIMEOUT_MS = 12_000;
const OG_FETCH_LIMIT = 12;

/** @type {Map<string, { ts: number, articles: object[] }>} */
const feedCache = new Map();

/** @type {Map<string, string | null>} */
const ogImageCache = new Map();

const TAG_RULES = [
  { tag: 'ENTREVISTA', re: /\b(interview|entrevista|speaks|habla|cuenta|recounts)\b/i },
  { tag: 'MERCADO', re: /\b(sign|firma|contract|deal|confirm|mercado|market)\b/i },
  { tag: 'RESULTADOS', re: /\b(win|wins|victory|podium|result|championship|gana|victoria|podium)\b/i },
  { tag: 'TÉCNICA', re: /\b(upgrade|technical|aero|wing|motor|engine|técnica|technical)\b/i },
  { tag: 'PADDOCK', re: /\b(paddock|reveals|admits|says|dice|afirma)\b/i },
  { tag: 'ANÁLISIS', re: /\b(analysis|análisis|why|how|guide|preview|q&a)\b/i },
];

function articleId(link) {
  return createHash('sha256').update(link).digest('base64url').slice(0, 16);
}

function inferTag(title, description) {
  const text = `${title} ${description}`;
  for (const { tag, re } of TAG_RULES) {
    if (re.test(text)) return tag;
  }
  return 'ANÁLISIS';
}

function readMinutes(text) {
  const words = String(text || '').split(/\s+/).filter(Boolean).length;
  const min = Math.max(1, Math.ceil(words / 200));
  return `${min} min`;
}

function relativeTimeEs(pubDate) {
  const t = pubDate ? Date.parse(pubDate) : NaN;
  if (!Number.isFinite(t)) return 'Reciente';
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Hace ${days}d`;
  return new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

async function fetchXml(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'BeEngine/1.0 (+https://beengine.local)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchOgImage(url) {
  const key = url.slice(0, 200);
  if (ogImageCache.has(key)) return ogImageCache.get(key);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6_000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'BeEngine/1.0', Accept: 'text/html' },
      redirect: 'follow',
    });
    if (!res.ok) {
      ogImageCache.set(key, null);
      return null;
    }
    const html = await res.text();
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    const img = m ? m[1].trim() : null;
    ogImageCache.set(key, img);
    return img;
  } catch {
    ogImageCache.set(key, null);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function enrichMissingImages(articles) {
  const need = articles.filter((a) => !a.imageUrl && a.url).slice(0, OG_FETCH_LIMIT);
  await Promise.all(
    need.map(async (a) => {
      const img = await fetchOgImage(a.url);
      if (img) a.imageUrl = img;
    }),
  );
}

function passesFeedFilter(item, feed) {
  if (feed.linkIncludes && !item.link.toLowerCase().includes(feed.linkIncludes.toLowerCase())) {
    return false;
  }
  if (feed.categoryIncludes) {
    const ok = item.categories.some(
      (c) => c.toLowerCase().includes(feed.categoryIncludes.toLowerCase()),
    );
    if (!ok) return false;
  }
  return Boolean(item.title && item.link);
}

function mapRawItem(item, category, feed) {
  const excerpt =
    item.description.length > 220
      ? `${item.description.slice(0, 217)}…`
      : item.description || item.title;

  return {
    id: articleId(item.link),
    cat: category,
    tag: inferTag(item.title, item.description),
    hot: false,
    title: item.title,
    excerpt,
    author: item.creator || feed.source,
    source: feed.source,
    time: relativeTimeEs(item.pubDate),
    readTime: readMinutes(`${item.title} ${item.description}`),
    featured: false,
    imageUrl: item.imageUrl,
    url: item.link,
    publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
  };
}

export async function fetchCategoryArticles(category) {
  const feeds = NEWS_FEEDS_BY_CATEGORY[category] ?? [];
  const merged = new Map();

  await Promise.all(
    feeds.map(async (feed) => {
      try {
        const xml = await fetchXml(feed.url);
        const items = parseRssItems(xml);
        for (const raw of items) {
          if (!passesFeedFilter(raw, feed)) continue;
          const art = mapRawItem(raw, category, feed);
          if (!merged.has(art.url)) merged.set(art.url, art);
        }
      } catch {
        /* feed opcional */
      }
    }),
  );

  let articles = [...merged.values()].sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });

  await enrichMissingImages(articles);

  if (articles.length > 0) {
    articles[0].hot = true;
    articles[0].featured = true;
  }
  if (articles.length > 3) {
    articles[2].featured = true;
  }

  return articles;
}

/**
 * @param {string} category
 * @param {{ tag?: string, limit?: number, offset?: number }} opts
 */
export async function getNewsArticles(category, opts = {}) {
  const tag = opts.tag ?? 'Todos';
  const limit = Math.min(60, Math.max(1, parseInt(String(opts.limit ?? '30'), 10) || 30));
  const offset = Math.max(0, parseInt(String(opts.offset ?? '0'), 10) || 0);

  if (DB_ENABLED) {
    try {
      const fromDb = await getNewsArticlesFromDb(category, { tag, limit, offset });
      if (fromDb?.items?.length) return fromDb;
    } catch {
      /* RSS live */
    }
  }

  const hit = feedCache.get(category);
  let articles;
  if (hit && Date.now() - hit.ts < CACHE_MS) {
    articles = hit.articles;
  } else {
    articles = await fetchCategoryArticles(category);
    feedCache.set(category, { ts: Date.now(), articles });
  }

  let filtered = articles;
  if (tag && tag !== 'Todos') {
    const want = tag.toUpperCase();
    filtered = articles.filter((a) => a.tag === want);
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(totalPages, Math.floor(offset / limit) + 1);
  const slice = filtered.slice(offset, offset + limit);

  return {
    category,
    tag,
    total,
    page,
    pageSize: limit,
    totalPages,
    items: slice,
  };
}

export async function getNewsArticleById(id) {
  for (const category of Object.keys(NEWS_FEEDS_BY_CATEGORY)) {
    await getNewsArticles(category, { limit: 60 });
    const hit = feedCache.get(category)?.articles?.find((a) => a.id === id);
    if (hit) return hit;
  }
  return null;
}

/** Resumen para home (tag, title, time, hot). */
export async function getNewsSummaryForHome(category, count = 4) {
  if (DB_ENABLED) {
    try {
      const fromDb = await getNewsSummaryFromDb(category, count);
      if (fromDb?.length) {
        return fromDb.map(({ tag, title, time, hot, imageUrl, id, cat }) => ({
          id,
          tag,
          title,
          time,
          hot: Boolean(hot),
          imageUrl: imageUrl ?? null,
          cat: cat ?? category,
        }));
      }
    } catch {
      /* RSS */
    }
  }
  const { items } = await getNewsArticles(category, { limit: count });
  return items.map(({ id, tag, title, time, hot, imageUrl, cat }) => ({
    id,
    tag,
    title,
    time,
    hot: Boolean(hot),
    imageUrl: imageUrl ?? null,
    cat: cat ?? category,
  }));
}
