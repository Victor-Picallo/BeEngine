import { JOLPICA_BASE_URL, EXTERNAL_API_TIMEOUT_MS } from '../../config/env.js';

const FRESH_TTL_MS = 60_000;       // standings/calendar change rarely
const STALE_TTL_MS = 30 * 60_000;
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 400;

const cache = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchOnce = async (path) => {
  const url = `${JOLPICA_BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTERNAL_API_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Jolpica HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

const get = async (path) => {
  const now = Date.now();
  const cached = cache.get(path);

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

  if (cached && now - cached.ts < STALE_TTL_MS) {
    return cached.data;
  }

  throw lastErr;
};

export const jolpicaClient = { get };
