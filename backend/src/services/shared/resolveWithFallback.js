import { DB_ENABLED, EXTERNAL_API_TIMEOUT_MS } from '../../config/env.js';

/**
 * @template T
 * @param {() => Promise<T>} liveFn
 * @param {() => Promise<T | null | undefined>} dbFn
 * @param {{ liveEnabled?: boolean, timeoutMs?: number }} [opts]
 * @returns {Promise<{ data: T, source: 'live' | 'db' | 'empty' }>}
 */
export async function resolveWithFallback(liveFn, dbFn, opts = {}) {
  const liveEnabled = opts.liveEnabled !== false;
  const timeoutMs = opts.timeoutMs ?? EXTERNAL_API_TIMEOUT_MS;

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
 * @param {{ liveEnabled?: boolean, timeoutMs?: number }} [opts]
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
