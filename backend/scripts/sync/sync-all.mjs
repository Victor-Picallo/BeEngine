/**
 * Sincroniza todas las series → Supabase
 * Uso: npm run db:sync
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const syncDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(syncDir, '..');

const steps = [
  ['f1', join(syncDir, 'sync-f1.mjs')],
  ['f2', join(syncDir, 'sync-feeder.mjs'), 'f2'],
  ['f3', join(syncDir, 'sync-feeder.mjs'), 'f3'],
  ['motogp', join(syncDir, 'sync-moto.mjs'), 'motogp'],
  ['moto2', join(syncDir, 'sync-moto.mjs'), 'moto2'],
  ['moto3', join(syncDir, 'sync-moto.mjs'), 'moto3'],
];

function runNode(script, ...args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: backendRoot,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited ${code}`));
    });
  });
}

async function main() {
  console.log('BeEngine db:sync — todas las series\n');
  for (const [label, script, ...args] of steps) {
    console.log(`\n=== ${label.toUpperCase()} ===`);
    await runNode(script, ...args);
  }

  console.log('\n=== PROFILE META ===');
  await runNode(join(syncDir, 'sync-profile-meta.mjs'));

  console.log('\n=== NEWS RSS ===');
  await runNode(join(syncDir, 'sync-news.mjs'));

  console.log('\nAll series synced (+ profiles + news).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
