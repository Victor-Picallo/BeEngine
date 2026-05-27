import { OPENF1_BASE_URL, EXTERNAL_API_TIMEOUT_MS } from '../../config/env.js';

// Cache config
const FRESH_TTL_MS = 15_000;     // serve from cache without hitting API
const STALE_TTL_MS = 5 * 60_000; // serve stale data on upstream failure
const RETRY_ATTEMPTS = 4;
const RETRY_DELAY_MS = 500;

/** OpenF1 rate-limits aggressively when the live page fires many endpoints at once. */
const MAX_CONCURRENT_FETCHES = 4;

const cache = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let activeFetches = 0;
const fetchQueue = [];

async function acquireFetchSlot() {
  if (activeFetches >= MAX_CONCURRENT_FETCHES) {
    await new Promise((resolve) => {
      fetchQueue.push(resolve);
    });
  }
  activeFetches += 1;
}

function releaseFetchSlot() {
  activeFetches -= 1;
  const next = fetchQueue.shift();
  if (next) next();
}

export class OpenF1HttpError extends Error {
  /** @param {number} statusCode Upstream HTTP status (e.g. 429). */
  constructor(message, statusCode) {
    super(message);
    this.name = 'OpenF1HttpError';
    this.statusCode = statusCode;
  }
}

const fetchOnce = async (path) => {
  const url = `${OPENF1_BASE_URL}${path}`;
  for (let burst = 0; burst < RETRY_ATTEMPTS; burst++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), EXTERNAL_API_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      // OpenF1 uses 404 to mean "no data for this query" (e.g. team_radio
      // for a session with no recordings). Treat it as an empty collection.
      if (res.status === 404) return [];
      if (res.status === 429 && burst < RETRY_ATTEMPTS - 1) {
        await sleep(700 + burst * 400);
        continue;
      }
      if ((res.status === 502 || res.status === 503 || res.status === 504) && burst < RETRY_ATTEMPTS - 1) {
        await sleep(RETRY_DELAY_MS + burst * 350);
        continue;
      }
      if (!res.ok) {
        throw new OpenF1HttpError(`OpenF1 HTTP ${res.status}: ${res.statusText}`, res.status);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
  throw new OpenF1HttpError('OpenF1 HTTP 429: Too Many Requests', 429);
};

const get = async (path) => {
  const now = Date.now();
  const cached = cache.get(path);

  if (cached && now - cached.ts < FRESH_TTL_MS) {
    return cached.data;
  }

  await acquireFetchSlot();
  let lastErr;
  try {
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
  } finally {
    releaseFetchSlot();
  }

  if (cached && now - cached.ts < STALE_TTL_MS) {
    return cached.data;
  }

  throw lastErr;
};

export const openF1Client = { get };
