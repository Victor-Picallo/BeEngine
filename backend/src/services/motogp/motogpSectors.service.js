import pdf from 'pdf-parse/lib/pdf-parse.js';
import { fetchSessionDetail, resolveSessionContext } from './motogpSessionContext.service.js';

const CACHE_MS = 45_000;
const sectorCache = new Map();

const TIME_RE = /^(?:\d+'\d{2}\.\d{3}|\d{2}\.\d{3})$/;
const RIDER_RE = /^[A-Z][A-Z.']{2,24}$/;
const LAP_TIME_RE = /\d+'\d{2}\.\d{3}/;
const SECTOR_TIME_RE = /\d{2}\.\d{3}/g;
const NATION_RE = /^[A-Z]{3}$/;
const RIDER_LINE_RE = /^(\d{1,3})([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'\s-]+)$/;
const RIDER_NAME_ONLY_RE = /^([A-Za-zÀ-ÿ]+(?:\s+[A-Z][A-Za-zÀ-ÿ.'-]+)+)$/;
const FAST_LAP_TIME_LINE_RE = /^(\d{1,2})(\d+'\d{2}\.\d{3})$/;

const sectorsFromLapLine = (line) => {
  const lapM = line.match(LAP_TIME_RE);
  if (!lapM) return null;
  let after = line.slice(line.indexOf(lapM[0]) + lapM[0].length);
  const glued = after.match(/^(\d)(\d{2}\.\d{3})/);
  if (glued) after = glued[2] + after.slice(glued[0].length);
  const sectorCandidates = [...after.matchAll(SECTOR_TIME_RE)]
    .map((m) => m[0])
    .filter((t) => {
      const n = Number.parseFloat(t);
      return n >= 15 && n <= 45;
    });
  if (sectorCandidates.length < 3) return null;
  return sectorCandidates.slice(0, 3);
};

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

/** FASTEST LAP OF EACH RIDER (FastLapRider.pdf). */
const parseFastLapRiderText = (text) => {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const start = lines.findIndex((l) => /FASTEST LAP OF EACH RIDER/i.test(l));
  const body = start >= 0 ? lines.slice(start) : lines;
  const riders = [];

  for (let i = 0; i < body.length; i += 1) {
    const head = body[i].match(RIDER_LINE_RE);
    if (!head) continue;
    const fullName = head[2].trim();
    const nation = body[i + 1];
    const lapLine = body[i + 2];
    if (!NATION_RE.test(nation ?? '') || !FAST_LAP_TIME_LINE_RE.test(lapLine ?? '')) continue;

    const lapM = lapLine.match(FAST_LAP_TIME_LINE_RE);
    const parts = fullName.split(/\s+/).filter(Boolean);
    const riderShortName =
      parts.length >= 2
        ? `${parts[0][0]}.${parts[parts.length - 1]}`.toUpperCase()
        : fullName.toUpperCase();

    riders.push({
      riderShortName,
      fullName: fullName.toUpperCase(),
      bestLap: lapM[2],
    });
    i += 2;
  }

  return riders;
};

const compoundToTireChar = (label) => {
  const k = String(label ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (k.includes('inter')) return 'i';
  if (k.includes('wet')) return 'w';
  if (k.includes('extra')) return 's';
  if (k.includes('hard')) return 'h';
  if (k.includes('medium')) return 'm';
  if (k.includes('soft')) return 's';
  return 'm';
};

const parseTyresFromLines = (lines, fromIdx) => {
  const chunk = lines.slice(fromIdx, fromIdx + 12).join(' ');
  const matches = [...chunk.matchAll(/Slick-(Soft|Medium|Hard|Extra\s*Soft|Intermediate|Wet)/gi)];
  if (!matches.length) return { frontTyre: null, rearTyre: null };
  const frontTyre = compoundToTireChar(matches[0][1]);
  const rearTyre = compoundToTireChar((matches[1] ?? matches[0])[1]);
  return { frontTyre, rearTyre };
};

const looksLikeRiderName = (fullName) => {
  const name = String(fullName ?? '').trim();
  if (!name || /tyre|slick|medium|soft|hard|Runs=|Valid laps/i.test(name)) return false;
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;
  return parts.every((p) => /^[A-Z][A-Za-z.'-]{1,}$/.test(p));
};

/** Mejores T1/T2/T3 por piloto desde Analysis.pdf (cronológico). */
const parseAnalysisSectorBests = (text) => {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const start = lines.findIndex((l) => /CHRONOLOGICAL ANALYSIS/i.test(l));
  const body = start >= 0 ? lines.slice(start) : lines;
  const riders = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    const bestSector = (list) =>
      list.length ? list.reduce((a, b) => (Number.parseFloat(a) <= Number.parseFloat(b) ? a : b)) : '—';
    const s1 = bestSector(current.s1);
    const s2 = bestSector(current.s2);
    const s3 = bestSector(current.s3);
    riders.push({
      riderShortName: current.riderShortName,
      fullName: current.fullName,
      s1,
      s2,
      s3,
      bestLap: current.bestLaps.length ? current.bestLaps.sort()[0] : '—',
      frontTyre: current.frontTyre,
      rearTyre: current.rearTyre,
    });
    current = null;
  };

  for (let lineIdx = 0; lineIdx < body.length; lineIdx += 1) {
    const line = body[lineIdx];
    const head = line.match(RIDER_LINE_RE);
    const nameOnly = !head && RIDER_NAME_ONLY_RE.test(line) && !LAP_TIME_RE.test(line);
    if ((head && !LAP_TIME_RE.test(line)) || nameOnly) {
      const fullName = (head ? head[2] : line).trim();
      if (!looksLikeRiderName(fullName)) continue;
      flush();
      const parts = fullName.split(/\s+/).filter(Boolean);
      const riderShortName =
        parts.length >= 2
          ? `${parts[0][0]}.${parts[parts.length - 1]}`.toUpperCase()
          : fullName.toUpperCase();
      const tyres = parseTyresFromLines(body, lineIdx);
      current = {
        fullName: fullName.toUpperCase(),
        riderShortName,
        s1: [],
        s2: [],
        s3: [],
        bestLaps: [],
        frontTyre: tyres.frontTyre,
        rearTyre: tyres.rearTyre,
      };
      continue;
    }
    if (!current || !LAP_TIME_RE.test(line)) continue;

    const lapM = line.match(LAP_TIME_RE);
    if (lapM) current.bestLaps.push(lapM[0]);

    const sectorTriplet = sectorsFromLapLine(line);
    if (sectorTriplet) {
      current.s1.push(sectorTriplet[0]);
      current.s2.push(sectorTriplet[1]);
      current.s3.push(sectorTriplet[2]);
    }
  }
  flush();
  return riders;
};

const mergeRiderTimingRows = (maps) => {
  const byKey = new Map();
  for (const list of maps) {
    for (const row of list) {
      const key = normalizeShort(row.riderShortName);
      const cur = byKey.get(key) ?? {
        riderShortName: row.riderShortName,
        fullName: row.fullName ?? null,
        s1: '—',
        s2: '—',
        s3: '—',
        bestLap: '—',
        frontTyre: null,
        rearTyre: null,
      };
      if (row.fullName) cur.fullName = row.fullName;
      if (row.s1 && row.s1 !== '—') cur.s1 = row.s1;
      if (row.s2 && row.s2 !== '—') cur.s2 = row.s2;
      if (row.s3 && row.s3 !== '—') cur.s3 = row.s3;
      if (row.bestLap && row.bestLap !== '—') cur.bestLap = row.bestLap;
      if (row.frontTyre) cur.frontTyre = row.frontTyre;
      if (row.rearTyre) cur.rearTyre = row.rearTyre;
      byKey.set(key, cur);
    }
  }
  return [...byKey.values()];
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
  const cacheKey = `${ctx.session.id}:sectors:v3`;
  const hit = sectorCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < cacheMs) return hit.data;

  let detail = null;
  try {
    detail = await fetchSessionDetail(ctx.session.id);
  } catch {
    detail = null;
  }

  const files = detail?.session_files ?? {};
  const bptUrl = fileUrl(files.best_partial_time);
  const flrUrl = fileUrl(files.fast_lap_rider);
  const analysisUrl = fileUrl(files.analysis);

  if (!bptUrl && !flrUrl && !analysisUrl) {
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
    const mergedLists = [];
    let source = 'session-pdf';

    if (bptUrl) {
      const text = await fetchPdfText(bptUrl);
      const parsed = parseBestPartialText(text);
      if (parsed.length) {
        mergedLists.push(parsed);
        source = 'best-partial-pdf';
      }
    }

    if (flrUrl) {
      const text = await fetchPdfText(flrUrl);
      const parsed = parseFastLapRiderText(text);
      if (parsed.length) {
        mergedLists.push(parsed);
        source = source === 'session-pdf' ? 'fast-lap-rider-pdf' : `${source}+fast-lap`;
      }
    }

    if (analysisUrl) {
      const text = await fetchPdfText(analysisUrl);
      const parsed = parseAnalysisSectorBests(text);
      if (parsed.length) {
        mergedLists.push(parsed);
        source = source === 'session-pdf' ? 'analysis-pdf' : `${source}+analysis`;
      }
    }

    const riders = mergeRiderTimingRows(mergedLists);
    const data = {
      source,
      round: ctx.round,
      sessionKey: ctx.sessionKey,
      sessionId: ctx.session.id,
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
