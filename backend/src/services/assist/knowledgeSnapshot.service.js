import { requirePrisma } from '../../lib/prisma.js';
import { ASSIST_MAX_SNAPSHOT_CHARS, DB_ENABLED } from '../../config/env.js';

function assertDb() {
  if (!DB_ENABLED) {
    const err = new Error('Base de datos no configurada');
    err.status = 503;
    throw err;
  }
  return requirePrisma();
}

const GLOBAL_SCOPE = 'global';

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function relevanceScore(snapshot, queryTokens) {
  if (!queryTokens.length) return 0;
  const hay = `${snapshot.title} ${snapshot.tags ?? ''} ${snapshot.content}`.toLowerCase();
  let score = 0;
  for (const t of queryTokens) {
    if (hay.includes(t)) score += 1;
  }
  if (snapshot.scope === GLOBAL_SCOPE) score += 0.25;
  return score;
}

/**
 * Snapshots activos para el scope (global + serie).
 * @param {{ scope?: string, message?: string }} opts
 */
export async function selectSnapshotsForChat({ scope, message, maxChars }) {
  const charLimit = maxChars ?? ASSIST_MAX_SNAPSHOT_CHARS;
  const prisma = assertDb();
  const seriesScope = normalizeScope(scope);
  const scopeFilter = scopesForQuery(seriesScope);
  const rows = await prisma.assistKnowledgeSnapshot.findMany({
    where: {
      isActive: true,
      OR: scopeFilter.map((s) => ({ scope: s })),
    },
    orderBy: { updatedAt: 'desc' },
  });

  const MASTER_SLUG = 'beengine-completo';
  const master = rows.find((r) => r.slug === MASTER_SLUG);
  if (master) {
    const block = master.content.trim();
    return {
      contextText: block.length > charLimit ? block.slice(0, charLimit) : block,
      sources: [{ slug: master.slug, title: master.title }],
    };
  }

  const queryTokens = tokenize(message);
  const ranked = rows
    .map((row) => ({ row, score: relevanceScore(row, queryTokens) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.row.updatedAt).getTime() - new Date(a.row.updatedAt).getTime(),
    );

  const blocks = [];
  const sources = [];
  let chars = 0;

  for (const { row } of ranked) {
    const block = `### ${row.title} (${row.slug})\n${row.content.trim()}`;
    if (chars + block.length > charLimit) {
      if (!blocks.length) {
        blocks.push(block.slice(0, charLimit));
        sources.push({ slug: row.slug, title: row.title });
      }
      break;
    }
    blocks.push(block);
    sources.push({ slug: row.slug, title: row.title });
    chars += block.length + 2;
  }

  return { contextText: blocks.join('\n\n'), sources };
}

function normalizeScope(scope) {
  const s = String(scope || '').trim().toLowerCase();
  const allowed = new Set(['f1', 'f2', 'f3', 'motogp', 'moto2', 'moto3', GLOBAL_SCOPE]);
  return allowed.has(s) ? s : GLOBAL_SCOPE;
}

function scopesForQuery(seriesScope) {
  const scopes = new Set([GLOBAL_SCOPE, seriesScope]);
  if (seriesScope === 'moto2' || seriesScope === 'moto3') {
    scopes.add('motogp');
  }
  return [...scopes];
}

/**
 * @param {{ slug: string, title: string, content: string, scope?: string, tags?: string }} input
 */
export async function upsertSnapshot(input) {
  const prisma = assertDb();
  const slug = String(input.slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .slice(0, 80);
  if (!slug) {
    const err = new Error('slug requerido');
    err.status = 400;
    throw err;
  }
  const title = String(input.title || slug).trim().slice(0, 200);
  const content = String(input.content || '').trim();
  if (!content) {
    const err = new Error('content vacío');
    err.status = 400;
    throw err;
  }
  const scope = normalizeScope(input.scope);
  const tags = input.tags ? String(input.tags).trim().slice(0, 500) : null;

  const existing = await prisma.assistKnowledgeSnapshot.findUnique({ where: { slug } });
  if (existing) {
    return prisma.assistKnowledgeSnapshot.update({
      where: { slug },
      data: {
        title,
        content,
        scope,
        tags,
        isActive: true,
        version: existing.version + 1,
      },
    });
  }
  return prisma.assistKnowledgeSnapshot.create({
    data: { slug, title, content, scope, tags },
  });
}

export async function listSnapshots() {
  const prisma = assertDb();
  return prisma.assistKnowledgeSnapshot.findMany({
    orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      scope: true,
      tags: true,
      isActive: true,
      version: true,
      updatedAt: true,
    },
  });
}
