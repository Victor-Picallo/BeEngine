import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_URL, DB_ENABLED } from '../config/env.js';

/** Prisma 7 + Supabase: requiere adapter con DATABASE_URL (pooler 6543). */
export function createPrismaClient() {
  if (!DB_ENABLED) return null;
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__beenginePrisma ?? (DB_ENABLED ? createPrismaClient() : null);

if (DB_ENABLED && prisma && process.env.NODE_ENV !== 'production') {
  globalForPrisma.__beenginePrisma = prisma;
}

export function requirePrisma() {
  if (!prisma) {
    throw new Error('DATABASE_URL no configurada — Prisma no disponible.');
  }
  return prisma;
}
