/**
 * Flujo completo post-GP — un solo comando (F1/F2/F3 + MotoGP/Moto2/Moto3).
 *
 *   npm run refresh
 *   npm run refresh:weekend
 *
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(scriptsDir, '..');
const syncDir = join(scriptsDir, 'sync');

const argv = process.argv.slice(2);
const weekend = argv.includes('--weekend');
const noStorage = argv.includes('--no-storage') || argv.includes('--skip-storage');

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
  let step = 0;
  const totalSteps = noStorage ? 5 : 6;

  console.log('\nBeEngine refresh — 6 series (coches + motos)\n');
  if (weekend) console.log('  Modo: fin de semana\n');
  if (noStorage) console.log('  Modo: sin subida a Storage\n');

  if (weekend) {
    await runNode(
      `${++step}/${totalSteps} · Sync fin de semana`,
      join(syncDir, 'sync-weekend.mjs'),
    );
  } else {
    await runNode(
      `${++step}/${totalSteps} · Sync datos (6 series + perfiles + noticias)`,
      join(syncDir, 'sync-all.mjs'),
    );
  }

  await runNode(
    `${++step}/${totalSteps} · Circuitos F1/F2/F3`,
    join(syncDir, 'enrich-formula-circuits.mjs'),
  );
  await runNode(
    `${++step}/${totalSteps} · Circuitos MotoGP/Moto2/Moto3`,
    join(syncDir, 'enrich-moto-circuits.mjs'),
  );

  if (!noStorage) {
    await runNode(
      `${++step}/${totalSteps} · Storage (logos, retratos, coches, motos, circuitos)`,
      join(scriptsDir, 'upload-media-to-supabase.mjs'),
    );
  } else {
    console.log('\n  (Storage omitido: --no-storage)\n');
  }

  await runNode(
    `${++step}/${totalSteps} · Auditoría medios 100% (6 series)`,
    join(scriptsDir, 'verify-media-db.mjs'),
    '--strict',
  );
  await runNode(
    `${++step}/${totalSteps} · Smoke fallback DB`,
    join(scriptsDir, 'smoke-db-fallback.mjs'),
  );

  const min = ((Date.now() - started) / 60_000).toFixed(1);
  console.log(`\n✓ Refresh completado (6 series) en ~${min} min`);
  console.log('  Health: http://localhost:3000/api/health\n');
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}\n`);
  process.exit(1);
});
