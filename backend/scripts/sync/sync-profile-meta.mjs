/**
 * Importa históricos/bios desde data/*.js → profile_meta
 * Uso: npm run db:sync:profiles
 */
import 'dotenv/config';
import { createPrismaClient } from '../../src/lib/prisma.js';
import { DRIVER_HISTORICAL_STATS } from '../../src/data/f1/f1DriverHistoricalStats.js';
import { CONSTRUCTOR_HISTORICAL_STATS } from '../../src/data/f1/f1ConstructorHistoricalStats.js';
import { MOTOGP_TEAM_PROFILES } from '../../src/data/motogp/motogpTeamProfiles.js';
import { MOTOGP_TEAM_HISTORICAL } from '../../src/data/motogp/motogpTeamHistorical.js';
import { MANUFACTURER_HISTORICAL } from '../../src/data/motogp/motogpManufacturerHistorical.js';

const prisma = createPrismaClient();
if (!prisma) {
  console.error('DATABASE_URL no configurada');
  process.exit(1);
}

async function upsertMeta(id, kind, seriesId, payload) {
  await prisma.profileMeta.upsert({
    where: { id },
    create: { id, kind, seriesId, payload },
    update: { kind, seriesId, payload },
  });
}

async function main() {
  let n = 0;

  for (const [driverId, payload] of Object.entries(DRIVER_HISTORICAL_STATS ?? {})) {
    await upsertMeta(`f1_driver_${driverId}`, 'driver_historical', 'f1', payload);
    n += 1;
  }

  for (const [constructorId, payload] of Object.entries(CONSTRUCTOR_HISTORICAL_STATS ?? {})) {
    await upsertMeta(`f1_constructor_${constructorId}`, 'constructor_historical', 'f1', payload);
    n += 1;
  }

  for (const [slug, profile] of Object.entries(MOTOGP_TEAM_PROFILES ?? {})) {
    await upsertMeta(`motogp_team_${slug}`, 'team_profile', 'motogp', profile);
    n += 1;
  }

  for (const [key, payload] of Object.entries(MOTOGP_TEAM_HISTORICAL ?? {})) {
    await upsertMeta(`motogp_team_hist_${key}`, 'team_historical', 'motogp', payload);
    n += 1;
  }

  for (const [key, payload] of Object.entries(MANUFACTURER_HISTORICAL ?? {})) {
    await upsertMeta(`motogp_mfr_hist_${key}`, 'manufacturer_historical', 'motogp', payload);
    n += 1;
  }

  console.log(`profile_meta: ${n} registros sincronizados`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
