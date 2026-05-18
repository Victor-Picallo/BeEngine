import { JOLPICA_BASE_URL, EXTERNAL_API_TIMEOUT_MS } from '../../config/env.js';

const FRESH_TTL_MS = 60_000;       // standings/calendar change rarely
const STALE_TTL_MS = 30 * 60_000;
const RETRY_ATTEMPTS = 4;
const RETRY_DELAY_MS = 550;

const cache = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Evita ráfagas que disparen 429; subir demasiado poco no ayuda, bajar bloquea el perfil. */
const MAX_CONCURRENT_FETCHES = 12;
let jolpicaActiveFetches = 0;
const jolpicaFetchQueue = [];

async function acquireJolpicaFetchSlot() {
  if (jolpicaActiveFetches >= MAX_CONCURRENT_FETCHES) {
    await new Promise((resolve) => {
      jolpicaFetchQueue.push(resolve);
    });
  }
  jolpicaActiveFetches += 1;
}

function releaseJolpicaFetchSlot() {
  jolpicaActiveFetches -= 1;
  const next = jolpicaFetchQueue.shift();
  if (next) next();
}

const fetchOnce = async (path, timeoutMs) => {
  const url = `${JOLPICA_BASE_URL}${path}`;
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
      if (!res.ok) throw new Error(`Jolpica HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Jolpica HTTP 429: Too Many Requests');
};

/** @param {string} path @param {{ timeoutMs?: number, freshTtlMs?: number, staleTtlMs?: number }} [options] */
const get = async (path, options = {}) => {
  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
    ? options.timeoutMs
    : EXTERNAL_API_TIMEOUT_MS;
  const freshTtlMs = Number.isFinite(options.freshTtlMs) && options.freshTtlMs > 0
    ? options.freshTtlMs
    : FRESH_TTL_MS;
  const staleTtlMs = Number.isFinite(options.staleTtlMs) && options.staleTtlMs > 0
    ? options.staleTtlMs
    : STALE_TTL_MS;
  const now = Date.now();
  const cached = cache.get(path);

  if (cached && now - cached.ts < (cached.freshTtlMs ?? FRESH_TTL_MS)) {
    return cached.data;
  }

  await acquireJolpicaFetchSlot();
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
    releaseJolpicaFetchSlot();
  }
};

export const jolpicaClient = { get };
