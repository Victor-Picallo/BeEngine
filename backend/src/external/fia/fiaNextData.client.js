import { EXTERNAL_API_TIMEOUT_MS } from '../../config/env.js';

const FRESH_TTL_MS = 60_000;
const STALE_TTL_MS = 30 * 60_000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

const cache = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const parseNextData = (html) => {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('FIA page missing __NEXT_DATA__');
  const data = JSON.parse(match[1]);
  const status = data.props?.pageProps?.statusCode;
  if (status && status !== 200) {
    throw new Error(`FIA page status ${status}`);
  }
  return data.props?.pageProps?.pageData ?? null;
};

const fetchOnce = async (url, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BeEngine/1.0 (+https://github.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) throw new Error(`FIA HTTP ${res.status}: ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
};

/**
 * @param {string} baseUrl e.g. https://www.fiaformula2.com
 * @param {string} path e.g. /Calendar
 * @param {{ timeoutMs?: number, freshTtlMs?: number, staleTtlMs?: number }} [options]
 */
export const fetchFiaPageData = async (baseUrl, path, options = {}) => {
  const url = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  const timeoutMs = options.timeoutMs ?? EXTERNAL_API_TIMEOUT_MS;
  const freshTtlMs = options.freshTtlMs ?? FRESH_TTL_MS;
  const staleTtlMs = options.staleTtlMs ?? STALE_TTL_MS;
  const now = Date.now();
  const cached = cache.get(url);

  if (cached && now - cached.ts < freshTtlMs) {
    return cached.data;
  }

  let lastErr;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const html = await fetchOnce(url, timeoutMs);
      const data = parseNextData(html);
      if (!data) throw new Error('FIA page empty pageData');
      cache.set(url, { data, ts: Date.now() });
      return data;
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }

  if (cached && Date.now() - cached.ts < staleTtlMs) {
    return cached.data;
  }

  throw lastErr;
};

export const clearFiaCache = () => cache.clear();
