import {
  getNewsByCategory,
  getNewsArticles,
  getNewsArticleById,
} from '../services/shared/news.service.js';
import { NEWS_TAGS } from '../data/shared/newsFeeds.config.js';
import { resolveRequestOpts } from '../utils/dataSourceOpts.js';
import { success, error } from '../utils/response.js';
import { HTTP_STATUS } from '../constants/http.js';

const NEWS_CACHE = 'public, max-age=60, stale-while-revalidate=300';
const NEWS_LIVE_CACHE = 'no-store';

function newsCacheHeader(req) {
  return req?.query?.refresh === 'live' ? NEWS_LIVE_CACHE : NEWS_CACHE;
}

export const getNews = async (req, res) => {
  try {
    const { category } = req.params;
    const items = await getNewsByCategory(category, resolveRequestOpts(req));
    if (!items) return error(res, 'Category not found', HTTP_STATUS.NOT_FOUND);
    success(res, { category, total: items.length, items }, 200, {
      'Cache-Control': newsCacheHeader(req),
    });
  } catch (err) {
    error(res, err.message);
  }
};

export const getNewsFeed = async (req, res) => {
  try {
    const { category } = req.params;
    const tag = String(req.query.tag ?? 'Todos');
    const limit = req.query.limit;
    const offset = req.query.offset;
    const data = await getNewsArticles(category, {
      tag,
      limit,
      offset,
      ...resolveRequestOpts(req),
    });
    success(res, data, 200, { 'Cache-Control': newsCacheHeader(req) });
  } catch (err) {
    error(res, err.message);
  }
};

export const getNewsArticle = async (req, res) => {
  try {
    const article = await getNewsArticleById(
      req.params.articleId,
      resolveRequestOpts(req),
    );
    if (!article) return error(res, 'Article not found', HTTP_STATUS.NOT_FOUND);
    success(res, article, 200, { 'Cache-Control': newsCacheHeader(req) });
  } catch (err) {
    error(res, err.message);
  }
};

export const getNewsMeta = (_req, res) => {
  success(res, { tags: NEWS_TAGS });
};
