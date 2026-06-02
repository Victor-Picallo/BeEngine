#!/usr/bin/env node
/**
 * Genera beengine-completo.md uniendo el resto de snapshots (sin el maestro).
 * Luego ejecuta seed o: npm run assist:snapshot:seed
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, '../docs/assist-snapshots');
const OUT = path.join(DIR, 'beengine-completo.md');
const SKIP = new Set(['beengine-completo.md']);

function stripFrontmatter(raw) {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return (match ? match[1] : raw).trim();
}

function titleFromBody(body, fallback) {
  const h1 = body.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : fallback;
}

const files = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.md') && !SKIP.has(f))
  .sort();

const parts = [];
for (const file of files) {
  const body = stripFrontmatter(fs.readFileSync(path.join(DIR, file), 'utf8'));
  const title = titleFromBody(body, file.replace(/\.md$/, ''));
  parts.push(`\n\n---\n\n## ${title}\n\n${body.replace(/^#\s+.+\n+/, '')}`);
}

const header = `---
slug: beengine-completo
title: BeEngine — guía completa
scope: global
tags: beengine ayuda guía completa f1 f2 f3 motogp moto2 moto3 login registro calendario clasificación live noticias pilotos escuderías equipos favoritos sidebar rutas api datos
---

# BeEngine — documentación completa

Este documento reúne **toda** la información de uso de la plataforma BeEngine (temporada 2026).
Para clasificación actual, líder del mundial o próxima carrera, el asistente también recibe **DATOS ACTUALES** desde la base de datos en tiempo de consulta.
`;

fs.writeFileSync(OUT, header + parts.join(''), 'utf8');
console.log(`Generado ${OUT} (${files.length} secciones)`);
