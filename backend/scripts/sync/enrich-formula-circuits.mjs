/**
 * Rellena circuitSvgUrl / circuitImageUrl en eventos F1/F2/F3.
 * Uso: npm run db:enrich:formula-circuits
 */
import 'dotenv/config';
import { createPrismaClient } from '../../src/lib/prisma.js';
import { seasonIdFor, currentSeasonYear } from '../../src/repositories/db/season.repository.js';
import { refreshAllSeasonCircuits } from '../../src/services/shared/circuitEnrichment.service.js';
import { SUPABASE_STORAGE_PUBLIC_BASE } from '../../src/config/env.js';

const SERIES = ['f1', 'f2', 'f3'];
const year = currentSeasonYear();

const prisma = createPrismaClient();
if (!prisma) {
  console.error('DATABASE_URL no configurada');
  process.exit(1);
}

async function main() {
  let totalUpdated = 0;
  for (const seriesId of SERIES) {
    const seasonId = seasonIdFor(seriesId, year);
    const res = await refreshAllSeasonCircuits(prisma, seasonId, year);
    const total = await prisma.event.count({ where: { seasonId } });
    const withUrls = await prisma.event.count({
      where: {
        seasonId,
        circuitSvgUrl: { startsWith: SUPABASE_STORAGE_PUBLIC_BASE },
        circuitImageUrl: { startsWith: SUPABASE_STORAGE_PUBLIC_BASE },
      },
    });
    console.log(
      `  ${seriesId}: ${withUrls}/${total} eventos con circuito completo (${res.updated} actualizados ahora)`,
    );
    totalUpdated += res.updated;
  }
  console.log(`\nDone — ${totalUpdated} eventos actualizados`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
