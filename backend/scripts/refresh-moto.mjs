/**
 * Cierra MotoGP + Moto2 + Moto3: sync → circuitos Pulse → storage → auditoría 100%.
 *
 *   npm run refresh:moto
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
  console.log('\nBeEngine refresh:moto (MotoGP + Moto2 + Moto3)\n');

  await runNode('1/5 · Sync MotoGP', join(scriptsDir, 'sync', 'sync-moto.mjs'), 'motogp');
  await runNode('2/5 · Sync Moto2', join(scriptsDir, 'sync', 'sync-moto.mjs'), 'moto2');
  await runNode('3/5 · Sync Moto3', join(scriptsDir, 'sync', 'sync-moto.mjs'), 'moto3');
  await runNode(
    '4/5 · Circuitos (Pulse SVG)',
    join(scriptsDir, 'sync', 'enrich-moto-circuits.mjs'),
  );
  await runNode(
    '5/5 · Storage Moto (logos, motos, retratos, circuitos)',
    join(scriptsDir, 'upload-media-to-supabase.mjs'),
    '--moto-only',
  );

  console.log(`\n${'═'.repeat(60)}\n  Auditoría Moto (debe ser 100%)\n${'═'.repeat(60)}\n`);
  const verify = spawn(
    process.execPath,
    [join(scriptsDir, 'verify-media-db.mjs'), '--moto', '--strict'],
    { cwd: backendRoot, stdio: 'inherit', env: process.env },
  );

  await new Promise((resolve, reject) => {
    verify.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error('Auditoría moto no pasó al 100%'));
    });
  });

  const min = ((Date.now() - started) / 60_000).toFixed(1);
  console.log(`\n✓ MotoGP/Moto2/Moto3 cerrados en ~${min} min\n`);
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}\n`);
  process.exit(1);
});
