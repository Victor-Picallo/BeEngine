/**
 * Comprueba que las 6 series devuelven standings desde DB cuando las APIs externas están off.
 *
 * Uso: npm run smoke:db   (requiere DATABASE_URL y datos sincronizados)
 */
import dotenv from 'dotenv';

dotenv.config();

process.env.JOLPICA_F1_ENABLED = '0';
process.env.FIA_F2_ENABLED = '0';
process.env.FIA_F3_ENABLED = '0';
process.env.PULSE_LIVE_ENABLED = '0';

const { DB_ENABLED } = await import('../src/config/env.js');

if (!DB_ENABLED) {
  console.error('smoke:db — DATABASE_URL no configurada');
  process.exit(1);
}

const { getDriverStandings: getF1 } = await import('../src/services/f1/jolpica.service.js');
const { getDriverStandings: getF2 } = await import('../src/services/f2/f2Data.service.js');
const { getDriverStandings: getF3 } = await import('../src/services/f3/f3Data.service.js');
const { getDriverStandings: getMoto } = await import('../src/services/motogp/pulseLive.service.js');

const cases = [
  { id: 'f1', run: () => getF1() },
  { id: 'f2', run: () => getF2() },
  { id: 'f3', run: () => getF3() },
  { id: 'motogp', run: () => getMoto('motogp') },
  { id: 'moto2', run: () => getMoto('moto2') },
  { id: 'moto3', run: () => getMoto('moto3') },
];

let failed = 0;

for (const { id, run } of cases) {
  try {
    const res = await run();
    const n = res.items?.length ?? 0;
    if (res.source !== 'db') {
      console.log(`FAIL  ${id}: source=${res.source ?? '?'} items=${n}`);
      failed += 1;
    } else if (n < 1) {
      console.log(`FAIL  ${id}: source=db pero sin pilotos (¿db:sync?)`);
      failed += 1;
    } else {
      console.log(`OK    ${id}: db items=${n}`);
    }
  } catch (err) {
    console.log(`FAIL  ${id}: ${err?.message ?? err}`);
    failed += 1;
  }
}

console.log(failed ? `\n${failed} serie(s) con fallo` : '\nTodas las series OK (fallback DB)');
process.exit(failed ? 1 : 0);
