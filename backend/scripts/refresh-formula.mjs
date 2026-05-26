/**
 * Cierra F1 + F2 + F3: sync → circuitos → storage → auditoría (debe salir 100%).
 *
 *   npm run refresh:formula
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(scriptsDir, '..');

function runNode(label, scriptPath, ...args) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'═'.repeat(60)}\n  ${label}\n${'═'.repeat(60)}\n`);
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: backendRoot,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} falló (código ${code})`));
    });
  });
}

async function main() {
  const started = Date.now();
  console.log('\nBeEngine refresh:formula (F1 + F2 + F3)\n');

  await runNode('1/5 · Sync F1', join(scriptsDir, 'sync', 'sync-f1.mjs'));
  await runNode('2/5 · Sync F2', join(scriptsDir, 'sync', 'sync-feeder.mjs'), 'f2');
  await runNode('3/5 · Sync F3', join(scriptsDir, 'sync', 'sync-feeder.mjs'), 'f3');
  await runNode(
    '4/5 · Circuitos (coggs/f1_svg + Pulse)',
    join(scriptsDir, 'sync', 'enrich-formula-circuits.mjs'),
  );
  await runNode(
    '5/5 · Storage F1/F2/F3 + circuitos en bucket',
    join(scriptsDir, 'upload-media-to-supabase.mjs'),
    '--skip-moto',
  );

  console.log(`\n${'═'.repeat(60)}\n  Auditoría F1/F2/F3 (debe ser 100%)\n${'═'.repeat(60)}\n`);
  const verify = spawn(
    process.execPath,
    [join(scriptsDir, 'verify-media-db.mjs'), '--formula', '--strict'],
    { cwd: backendRoot, stdio: 'inherit', env: process.env },
  );

  await new Promise((resolve, reject) => {
    verify.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error('Auditoría formula no pasó al 100%'));
    });
  });

  const min = ((Date.now() - started) / 60_000).toFixed(1);
  console.log(`\n✓ F1/F2/F3 cerrados en ~${min} min\n`);
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}\n`);
  process.exit(1);
});
