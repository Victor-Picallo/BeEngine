#!/usr/bin/env node
/**
 * Sube o actualiza snapshots del asistente IA.
 *
 * Cada .md puede incluir frontmatter YAML:
 * ---
 * slug: mi-doc
 * title: Título
 * scope: global|f1|f2|f3|motogp|moto2|moto3
 * tags: palabras clave
 * ---
 *
 * Uso:
 *   npm run assist:snapshot:seed
 *   npm run assist:snapshot:upsert -- --file docs/assist-snapshots/foo.md --slug foo
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { upsertSnapshot } from '../src/services/assist/knowledgeSnapshot.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = path.join(__dirname, '../docs/assist-snapshots');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: raw.trim() };
  }
  const meta = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([\w-]+):\s*(.+)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  return { meta, body: match[2].trim() };
}

function parseArgs(argv) {
  const out = { seed: false, file: '', slug: '', title: '', scope: 'global', tags: '' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seed') out.seed = true;
    else if (a === '--file' && argv[i + 1]) out.file = argv[++i];
    else if (a === '--slug' && argv[i + 1]) out.slug = argv[++i];
    else if (a === '--title' && argv[i + 1]) out.title = argv[++i];
    else if (a === '--scope' && argv[i + 1]) out.scope = argv[++i];
    else if (a === '--tags' && argv[i + 1]) out.tags = argv[++i];
  }
  return out;
}

async function upsertFromFile({ file, slug, title, scope, tags }) {
  const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const raw = fs.readFileSync(abs, 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  const row = await upsertSnapshot({
    slug: slug || meta.slug,
    title: title || meta.title,
    content: body,
    scope: scope || meta.scope,
    tags: tags || meta.tags,
  });
  console.log(`OK  ${row.slug}  v${row.version}  scope=${row.scope}`);
}

async function runSeed() {
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    console.error('No existe:', SNAPSHOTS_DIR);
    process.exit(1);
  }
  const files = fs
    .readdirSync(SNAPSHOTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();
  if (!files.length) {
    console.error('No hay archivos .md en', SNAPSHOTS_DIR);
    process.exit(1);
  }
  for (const file of files) {
    await upsertFromFile({ file: path.join(SNAPSHOTS_DIR, file) });
  }
  console.log(`\n${files.length} snapshot(s) cargados.`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.seed) {
    await runSeed();
    return;
  }
  if (!args.file || !args.slug) {
    console.error(
      'Uso: node scripts/assist-snapshot-upsert.mjs --file <path> --slug <slug> [--title] [--scope] [--tags]\n' +
        '     npm run assist:snapshot:seed',
    );
    process.exit(1);
  }
  await upsertFromFile(args);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
