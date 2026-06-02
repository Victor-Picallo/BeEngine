import { DB_ENABLED, EXTERNAL_API_TIMEOUT_MS, PREFER_DB_FIRST } from '../../config/env.js';

/**
 * @param {unknown} data
 */
function hasDbData(data) {
  if (data == null) return false;
  if (Array.isArray(data)) return data.length > 0;
  if (typeof data === 'object' && Array.isArray(data.items)) {
    return data.items.length > 0;
  }
  if (typeof data === 'object' && Array.isArray(data.results)) {
    return data.results.length > 0;
  }
  return true;
}

/**
 * @template T
 * @param {() => Promise<T>} liveFn
 * @param {() => Promise<T | null | undefined>} dbFn
 * @param {{ liveEnabled?: boolean, preferDb?: boolean, timeoutMs?: number }} [opts]
 * @returns {Promise<{ data: T, source: 'live' | 'db' | 'empty' }>}
 */
export async function resolveWithFallback(liveFn, dbFn, opts = {}) {
  const preferDb = opts.preferDb !== false && PREFER_DB_FIRST;
  /** Con DB-first no bloqueamos la UI esperando APIs externas (salvo allowLiveFallback). */
  const skipLive =
    PREFER_DB_FIRST && preferDb && opts.allowLiveFallback !== true;
  const liveEnabled = opts.liveEnabled !== false && !skipLive;
  const timeoutMs = opts.timeoutMs ?? EXTERNAL_API_TIMEOUT_MS;

  let dbData = null;

  if (DB_ENABLED) {
    try {
      dbData = await dbFn();
      if (preferDb && hasDbData(dbData)) {
        return { data: dbData, source: 'db' };
      }
    } catch {
      dbData = null;
    }
  }

  if (liveEnabled) {
    try {
      const data = await runWithTimeout(liveFn(), timeoutMs);
      if (data != null) {
        return { data, source: 'live' };
      }
    } catch {
      /* fallback to DB */
    }
  }

  if (DB_ENABLED) {
    if (dbData != null) {
      return { data: dbData, source: 'db' };
    }
    try {
      const data = await dbFn();
      if (data != null) {
        return { data, source: 'db' };
      }
    } catch {
      /* empty */
    }
  }

  throw new Error('No data available (live API failed and database empty)');
}

/**
 * @template T
 * @param {() => Promise<T>} liveFn
 * @param {() => Promise<T | null | undefined>} dbFn
 * @param {T} emptyValue
 * @param {{ liveEnabled?: boolean, preferDb?: boolean, timeoutMs?: number }} [opts]
 */
export async function resolveWithFallbackOrEmpty(liveFn, dbFn, emptyValue, opts = {}) {
  try {
    return await resolveWithFallback(liveFn, dbFn, opts);
  } catch {
    return { data: emptyValue, source: 'empty' };
  }
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} timeoutMs
 */
function runWithTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

/**
 * @template T
 * @param {{ data: T, source: string }} resolved
 * @param {T} [itemsFallback]
 */
export function wrapItemsResponse(resolved, itemsFallback = []) {
  const items = Array.isArray(resolved.data) ? resolved.data : resolved.data?.items ?? itemsFallback;
  return { items, source: resolved.source };
}
