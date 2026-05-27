/**
 * Comprueba que profile_meta está poblado (fuente de verdad en Postgres).
 * Uso: npm run db:sync:profiles
 */
import 'dotenv/config';
import { createPrismaClient } from '../../src/lib/prisma.js';

const prisma = createPrismaClient();
if (!prisma) {
  console.error('DATABASE_URL no configurada');
  process.exit(1);
}

async function main() {
  const count = await prisma.profileMeta.count();
  if (count < 1) {
    console.error(
      'profile_meta vacío. Importa datos históricos (migración previa o backup) antes de arrancar el API.',
    );
    process.exit(1);
  }
  const byKind = await prisma.profileMeta.groupBy({
    by: ['kind'],
    _count: { _all: true },
  });
  console.log(`profile_meta OK — ${count} registros`);
  for (const row of byKind) {
    console.log(`  ${row.kind}: ${row._count._all}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
