/**
 * Sync ligero fin de semana: standings + resultados de rondas terminadas.
 * Uso: npm run db:sync:weekend
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const syncDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(syncDir, '..');

const steps = [
  ['f1', join(syncDir, 'sync-f1.mjs'), '--weekend'],
  ['f2', join(syncDir, 'sync-feeder.mjs'), 'f2', '--weekend'],
  ['f3', join(syncDir, 'sync-feeder.mjs'), 'f3', '--weekend'],
  ['motogp', join(syncDir, 'sync-moto.mjs'), 'motogp', '--weekend'],
  ['moto2', join(syncDir, 'sync-moto.mjs'), 'moto2', '--weekend'],
  ['moto3', join(syncDir, 'sync-moto.mjs'), 'moto3', '--weekend'],
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
  console.log('BeEngine db:sync:weekend\n');
  for (const [label, script, ...args] of steps) {
    console.log(`\n=== ${label.toUpperCase()} ===`);
    await runNode(script, ...args);
  }
  console.log('\nWeekend sync done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
