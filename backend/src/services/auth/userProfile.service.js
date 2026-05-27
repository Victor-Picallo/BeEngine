import { requirePrisma } from '../../lib/prisma.js';
import { DB_ENABLED } from '../../config/env.js';

function assertDb() {
  if (!DB_ENABLED) {
    const err = new Error('Base de datos no configurada');
    err.status = 503;
    throw err;
  }
  return requirePrisma();
}

/** @param {import('@supabase/supabase-js').User} authUser */
export async function getMe(authUser) {
  const prisma = assertDb();
  const profile = await prisma.userProfile.findUnique({
    where: { id: authUser.id },
    include: { favorites: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!profile) {
    return {
      id: authUser.id,
      email: authUser.email ?? '',
      displayName: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
      favorites: [],
    };
  }
  return mapProfile(profile);
}

function mapProfile(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    favorites: row.favorites.map((f) => ({
      kind: f.kind,
      seriesId: f.seriesId,
      driverId: f.driverId,
      label: f.label,
      teamLabel: f.teamLabel,
    })),
  };
}

/**
 * @param {import('@supabase/supabase-js').User} authUser
 * @param {{ displayName?: string | null, favorites?: Array<{ kind: string, seriesId: string, driverId?: string | null, label?: string | null, teamLabel?: string | null }> }} body
 */
export async function bootstrapProfile(authUser, body) {
  const prisma = assertDb();
  const email = authUser.email;
  if (!email) {
    const err = new Error('El usuario no tiene email');
    err.status = 400;
    throw err;
  }

  const displayName =
    typeof body.displayName === 'string' && body.displayName.trim()
      ? body.displayName.trim().slice(0, 120)
      : null;

  const favorites = normalizeFavorites(body.favorites);

  await prisma.$transaction(async (tx) => {
    await tx.userProfile.upsert({
      where: { id: authUser.id },
      create: {
        id: authUser.id,
        email,
        displayName,
      },
      update: {
        email,
        ...(displayName != null ? { displayName } : {}),
      },
    });

    if (favorites !== null) {
      await tx.userFavorite.deleteMany({ where: { userId: authUser.id } });
      if (favorites.length) {
        await tx.userFavorite.createMany({
          data: favorites.map((f, i) => ({
            userId: authUser.id,
            kind: f.kind,
            seriesId: f.seriesId,
            driverId: f.driverId,
            label: f.label,
            teamLabel: f.teamLabel,
            sortOrder: i,
          })),
        });
      }
    }
  });

  return getMe(authUser);
}

function normalizeFavorites(raw) {
  if (raw === undefined) return null;
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const kind = String(item.kind || '').trim();
    const seriesId = String(item.seriesId || '').trim();
    if (!kind || !seriesId) continue;
    if (kind !== 'category' && kind !== 'driver') continue;
    if (kind === 'driver' && !String(item.driverId || '').trim()) continue;
    out.push({
      kind,
      seriesId,
      driverId:
        kind === 'driver' ? String(item.driverId).trim().slice(0, 64) : null,
      label: item.label ? String(item.label).trim().slice(0, 120) : null,
      teamLabel: item.teamLabel ? String(item.teamLabel).trim().slice(0, 120) : null,
    });
  }
  return out;
}
