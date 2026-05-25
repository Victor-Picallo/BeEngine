import pdf from 'pdf-parse/lib/pdf-parse.js';
import { fetchSessionDetail, resolveSessionContext } from './motogpSessionContext.service.js';

const CACHE_MS = 45_000;
const sectorCache = new Map();

const TIME_RE = /^(?:\d+'\d{2}\.\d{3}|\d{2}\.\d{3})$/;
const RIDER_RE = /^[A-Z][A-Z.']{2,24}$/;

const fileUrl = (entry) => {
  if (!entry) return null;
  if (typeof entry === 'string' && entry.startsWith('http')) return entry;
  if (typeof entry === 'object' && typeof entry.url === 'string' && entry.url.startsWith('http')) {
    return entry.url;
  }
  return null;
};

const normalizeShort = (name) =>
  String(name ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

/**
 * Parsea BestPartialTime.pdf: tabla ideal por piloto (T1/T2/T3 + vuelta ideal).
 */
const parseBestPartialText = (text) => {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const start = lines.findIndex((l) => /BEST PARTIAL TIMES/i.test(l));
  const slice = start >= 0 ? lines.slice(start) : lines;
  const end = slice.findIndex((l) => /cannot be reproduced/i.test(l));
  const body = end > 0 ? slice.slice(0, end) : slice;

  const riders = [];
  let i = 0;
  while (i < body.length) {
    const pos = Number.parseInt(body[i], 10);
    if (!Number.isInteger(pos) || pos < 1 || pos > 30) {
      i += 1;
      continue;
    }
    const chunk = [];
    i += 1;
    while (i < body.length) {
      const nextPos = Number.parseInt(body[i], 10);
      if (
        Number.isInteger(nextPos) &&
        nextPos >= 1 &&
        nextPos <= 30 &&
        chunk.length >= 4
      ) {
        break;
      }
      chunk.push(body[i]);
      i += 1;
    }

    const times = chunk.filter((l) => TIME_RE.test(l));
    const names = chunk.filter((l) => RIDER_RE.test(l));
    if (times.length < 3 || !names.length) continue;

    const rider = names[0];
    riders.push({
      position: pos,
      riderShortName: rider,
      s1: times[0] ?? '—',
      s2: times[1] ?? '—',
      s3: times[2] ?? '—',
      bestLap: times.find((t) => t.includes("'")) ?? times[3] ?? '—',
      idealLap: times[0]?.includes("'") ? times[0] : times.find((t) => t.includes("'")) ?? '—',
    });
  }

  return riders;
};

const fetchPdfText = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`PDF HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const parsed = await pdf(buf);
  return parsed.text ?? '';
};

/**
 * Sectores por sesión (BestPartialTime.pdf oficial cuando está publicado).
 */
export const getSessionSectors = async (
  round,
  sessionKey = 'race',
  categoryId = 'motogp',
  options = {},
) => {
  const ctx = await resolveSessionContext(round, sessionKey, categoryId);
  if (!ctx) return { source: 'none', riders: [] };

  const cacheMs = Number(options.cacheMs) > 0 ? Number(options.cacheMs) : CACHE_MS;
  const cacheKey = `${ctx.session.id}:sectors`;
  const hit = sectorCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < cacheMs) return hit.data;

  let detail = null;
  try {
    detail = await fetchSessionDetail(ctx.session.id);
  } catch {
    detail = null;
  }

  const files = detail?.session_files ?? {};
  const pdfUrl =
    fileUrl(files.best_partial_time) ??
    fileUrl(files.analysis) ??
    null;

  if (!pdfUrl) {
    const empty = {
      source: 'pending',
      round: ctx.round,
      sessionKey: ctx.sessionKey,
      sessionId: ctx.session.id,
      riders: [],
    };
    sectorCache.set(cacheKey, { data: empty, ts: Date.now() });
    return empty;
  }

  try {
    const text = await fetchPdfText(pdfUrl);
    const riders = parseBestPartialText(text);
    const data = {
      source: pdfUrl.includes('BestPartial') ? 'best-partial-pdf' : 'analysis-pdf',
      round: ctx.round,
      sessionKey: ctx.sessionKey,
      sessionId: ctx.session.id,
      pdfUrl,
      riders,
    };
    sectorCache.set(cacheKey, { data, ts: Date.now() });
    return data;
  } catch (err) {
    const fail = {
      source: 'error',
      round: ctx.round,
      sessionKey: ctx.sessionKey,
      sessionId: ctx.session.id,
      riders: [],
      error: err.message,
    };
    sectorCache.set(cacheKey, { data: fail, ts: Date.now() - CACHE_MS + 10_000 });
    return fail;
  }
};

/** Mapa por shortName normalizado para fusionar con livetiming. */
export const sectorsByShortName = (riders) => {
  const map = new Map();
  for (const r of riders ?? []) {
    map.set(normalizeShort(r.riderShortName), r);
  }
  return map;
};

export { normalizeShort as normalizeRiderShortName };
