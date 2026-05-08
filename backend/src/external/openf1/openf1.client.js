import { OPENF1_BASE_URL, EXTERNAL_API_TIMEOUT_MS } from '../../config/env.js';

// Cache config
const FRESH_TTL_MS = 15_000;     // serve from cache without hitting API
const STALE_TTL_MS = 5 * 60_000; // serve stale data on upstream failure
const RETRY_ATTEMPTS = 2;        // total fetch attempts before giving up
const RETRY_DELAY_MS = 400;

// path → { data, ts } in-memory cache
const cache = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchOnce = async (path) => {
  const url = `${OPENF1_BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTERNAL_API_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    // OpenF1 uses 404 to mean "no data for this query" (e.g. team_radio
    // for a session with no recordings). Treat it as an empty collection
    // instead of a hard error.
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`OpenF1 HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

const get = async (path) => {
  const now = Date.now();
  const cached = cache.get(path);

  // Fresh cache hit — skip network entirely
  if (cached && now - cached.ts < FRESH_TTL_MS) {
    return cached.data;
  }

  let lastErr;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const data = await fetchOnce(path);
      cache.set(path, { data, ts: now });
      return data;
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }

  // Upstream failed — serve stale cache if available and within stale window
  if (cached && now - cached.ts < STALE_TTL_MS) {
    return cached.data;
  }

  throw lastErr;
};

export const openF1Client = { get };
