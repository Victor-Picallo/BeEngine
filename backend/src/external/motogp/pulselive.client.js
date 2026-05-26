import { EXTERNAL_API_TIMEOUT_MS, MOTOGP_PULSELIVE_BASE_URL } from '../../config/env.js';

export { MOTOGP_PULSELIVE_BASE_URL };

/** MotoGP™ category UUID (2026+). */
export const MOTOGP_CATEGORY_UUID = 'e8c110ad-64aa-4e8e-8a86-f2f152f6a942';
/** Moto2 category UUID (2026+). */
export const MOTO2_CATEGORY_UUID = '549640b8-fd9c-4245-acfd-60e4bc38b25c';
/** Moto3 category UUID (2026+). */
export const MOTO3_CATEGORY_UUID = '954f7e65-2ef2-4423-b949-4961cc603e45';

const FRESH_TTL_MS = 60_000;
const STALE_TTL_MS = 30 * 60_000;
const RETRY_ATTEMPTS = 4;
const RETRY_DELAY_MS = 550;

const cache = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MAX_CONCURRENT_FETCHES = 6;
let activeFetches = 0;
const fetchQueue = [];

async function acquireSlot() {
  if (activeFetches >= MAX_CONCURRENT_FETCHES) {
    await new Promise((resolve) => {
      fetchQueue.push(resolve);
    });
  }
  activeFetches += 1;
}

function releaseSlot() {
  activeFetches -= 1;
  const next = fetchQueue.shift();
  if (next) next();
}

const fetchOnce = async (path, timeoutMs) => {
  const url = `${MOTOGP_PULSELIVE_BASE_URL}${path}`;
  for (let burst = 0; burst < 4; burst++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.status === 429 && burst < 3) {
        await sleep(650 + burst * 350);
        continue;
      }
      if ((res.status === 502 || res.status === 503 || res.status === 504) && burst < 3) {
        await sleep(500 + burst * 400);
        continue;
      }
      if (!res.ok) throw new Error(`PulseLive HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('PulseLive HTTP 429: Too Many Requests');
};

/** @param {string} path @param {{ timeoutMs?: number, freshTtlMs?: number, staleTtlMs?: number }} [options] */
const get = async (path, options = {}) => {
  const timeoutMs =
    Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
      ? options.timeoutMs
      : EXTERNAL_API_TIMEOUT_MS;
  const freshTtlMs =
    Number.isFinite(options.freshTtlMs) && options.freshTtlMs > 0
      ? options.freshTtlMs
      : FRESH_TTL_MS;
  const staleTtlMs =
    Number.isFinite(options.staleTtlMs) && options.staleTtlMs > 0
      ? options.staleTtlMs
      : STALE_TTL_MS;
  const now = Date.now();
  const cached = cache.get(path);

  if (cached && now - cached.ts < (cached.freshTtlMs ?? FRESH_TTL_MS)) {
    return cached.data;
  }

  await acquireSlot();
  try {
    let lastErr;
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        const data = await fetchOnce(path, timeoutMs);
        cache.set(path, { data, ts: Date.now(), freshTtlMs, staleTtlMs });
        return data;
      } catch (err) {
        lastErr = err;
        if (attempt < RETRY_ATTEMPTS) await sleep(RETRY_DELAY_MS);
      }
    }

    if (cached && Date.now() - cached.ts < (cached.staleTtlMs ?? STALE_TTL_MS)) {
      return cached.data;
    }

    throw lastErr;
  } finally {
    releaseSlot();
  }
};

export const pulseliveClient = { get };
