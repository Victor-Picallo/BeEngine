/**
 * Catálogo de series BeEngine. Ejecutar: npm run db:seed
 */
import 'dotenv/config';
import { createPrismaClient } from '../src/lib/prisma.js';

const prisma = createPrismaClient();
if (!prisma) {
  console.error('DATABASE_URL no definida en .env');
  process.exit(1);
}

const SERIES = [
  { id: 'f1', label: 'Formula 1', short: 'F1', accent: '#FFD100' },
  { id: 'f2', label: 'Formula 2', short: 'F2', accent: '#0090FF' },
  { id: 'f3', label: 'Formula 3', short: 'F3', accent: '#9E9E9E' },
  { id: 'motogp', label: 'MotoGP', short: 'MotoGP', accent: '#0052CC' },
  { id: 'moto2', label: 'Moto 2', short: 'Moto2', accent: '#FF6B35' },
  { id: 'moto3', label: 'Moto 3', short: 'Moto3', accent: '#52C41A' },
];

const CURRENT_YEAR = 2026;

async function main() {
  for (const s of SERIES) {
    await prisma.series.upsert({
      where: { id: s.id },
      create: s,
      update: { label: s.label, short: s.short, accent: s.accent },
    });
    const seasonId = `${s.id}_${CURRENT_YEAR}`;
    await prisma.season.upsert({
      where: { id: seasonId },
      create: { id: seasonId, seriesId: s.id, year: CURRENT_YEAR },
      update: {},
    });
  }
  console.log(`Seeded ${SERIES.length} series + ${CURRENT_YEAR} seasons.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
