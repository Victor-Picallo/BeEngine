/**
 * Sube medios → Supabase beengine-media y actualiza Postgres.
 * - Moto: logos en frontend/public + retratos/coches remotos
 * - F1/F2/F3: logos, coches y retratos desde CDN oficial (FOM / Cloudinary / OpenF1)
 *
 * Requiere en .env: SUPABASE_SERVICE_ROLE_KEY (+ DATABASE_URL)
 * Uso: npm run storage:upload
 */
import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createPrismaClient } from '../src/lib/prisma.js';
import {
  mimeForFile,
  publicStorageUrl,
  storageConfigured,
  uploadFile,
} from '../src/lib/supabaseStorage.js';
import { seasonIdFor, currentSeasonYear } from '../src/repositories/db/season.repository.js';
import { SUPABASE_STORAGE_PUBLIC_BASE } from '../src/config/env.js';
import { MOTO2_DRIVER_PORTRAIT_URL } from '../src/data/moto2/moto2DriverPortraits.js';
import { MOTO3_DRIVER_PORTRAIT_URL } from '../src/data/moto3/moto3DriverPortraits.js';
import { MOTO2_TEAM_ASSETS } from '../src/data/moto2/moto2TeamAssets.js';
import { MOTO3_TEAM_ASSETS } from '../src/data/moto3/moto3TeamAssets.js';
import { F1_CONSTRUCTORS_GRID_2026 } from '../src/data/f1/f1ConstructorsGrid2026.js';
import { F1_DRIVERS_GRID_2026 } from '../src/data/f1/f1DriversGrid2026.js';
import { f1TeamCarImageUrl, f1TeamShowcaseImageUrl } from '../src/services/f1/teamMedia.js';
import { getDrivers } from '../src/services/f1/openf1.service.js';
import {
  F2_DRIVER_HEADSHOT_URL,
  F2_TEAM_CAR_URL,
  F2_TEAM_LOGO_URL,
} from '../src/data/f2/f2MediaAssets.js';
import {
  F3_DRIVER_HEADSHOT_URL,
  F3_TEAM_CAR_URL,
  F3_TEAM_LOGO_URL,
} from '../src/data/f3/f3MediaAssets.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const publicRoot = join(root, 'frontend', 'public');
const SERIES = ['motogp', 'moto2', 'moto3'];
const motogpOnly = process.argv.includes('--motogp-only');
const motoOnly = process.argv.includes('--moto-only');
const circuitsOnly = process.argv.includes('--circuits-only');
const skipMoto = process.argv.includes('--skip-moto');
const formulaOnly = process.argv.includes('--formula-only');
const MOTO_SERIES = ['motogp', 'moto2', 'moto3'];

const needsRemoteUpload = (url) => {
  if (!url?.startsWith('http')) return false;
  const base = SUPABASE_STORAGE_PUBLIC_BASE || '';
  if (base && url.startsWith(base)) return false;
  return true;
};

function constructorIdFromFile(fileName) {
  return basename(fileName, extname(fileName));
}

async function uploadSeriesLogos(seriesId) {
  const teamsDir = join(publicRoot, seriesId, 'teams');
  let files;
  try {
    files = await readdir(teamsDir);
  } catch {
    console.warn(`  skip ${seriesId}: no ${teamsDir}`);
    return { uploaded: 0, dbUpdated: 0 };
  }

  const images = files.filter((f) => /\.(png|jpe?g|svg|webp)$/i.test(f));
  let uploaded = 0;
  const urlByConstructor = new Map();

  for (const file of images) {
    const storagePath = `${seriesId}/constructors/${file}`;
    const body = await readFile(join(teamsDir, file));
    const url = await uploadFile(storagePath, body, mimeForFile(file));
    const cid = constructorIdFromFile(file);
    urlByConstructor.set(cid, url);
    uploaded += 1;
    console.log(`  ↑ ${storagePath}`);
  }

  return { uploaded, urlByConstructor };
}

async function updateDbLogos(prisma, seriesId, urlByConstructor) {
  const seasonId = seasonIdFor(seriesId, currentSeasonYear());
  let dbUpdated = 0;

  for (const [constructorId, logoUrl] of urlByConstructor) {
    const hit = await prisma.constructorSeason.updateMany({
      where: { seasonId, constructorId },
      data: { logoUrl },
    });
    if (hit.count > 0) {
      dbUpdated += hit.count;
      continue;
    }
    const fuzzy = await prisma.constructorSeason.findMany({ where: { seasonId } });
    const match = fuzzy.find(
      (r) =>
        r.constructorId === constructorId ||
        r.constructorId.includes(constructorId) ||
        constructorId.includes(r.constructorId),
    );
    if (match) {
      await prisma.constructorSeason.update({
        where: {
          seasonId_constructorId: {
            seasonId,
            constructorId: match.constructorId,
          },
        },
        data: { logoUrl },
      });
      dbUpdated += 1;
    }
  }

  return dbUpdated;
}

function extFromResponse(remoteUrl, contentType) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('png')) return '.png';
  if (ct.includes('svg')) return '.svg';
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg';
  const u = remoteUrl.toLowerCase();
  if (u.includes('.webp')) return '.webp';
  if (u.includes('.png')) return '.png';
  if (u.includes('.svg')) return '.svg';
  return '.jpg';
}

async function uploadRemoteImage(storagePath, remoteUrl) {
  const res = await fetch(remoteUrl, {
    headers: { 'User-Agent': 'BeEngine/1.0 (media-sync)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = extFromResponse(remoteUrl, res.headers.get('content-type'));
  const path = storagePath.includes('.') ? storagePath : `${storagePath}${ext}`;
  const url = await uploadFile(path, buf, mimeForFile(path));
  return { path, url };
}

async function uploadConstructorMedia(prisma, seriesId, logoMap, carMap) {
  const seasonId = seasonIdFor(seriesId, currentSeasonYear());
  let uploaded = 0;
  let dbUpdated = 0;
  const constructorIds = new Set([
    ...Object.keys(logoMap || {}),
    ...Object.keys(carMap || {}),
  ]);

  for (const constructorId of constructorIds) {
    const logoRemote = logoMap?.[constructorId];
    const carRemote = carMap?.[constructorId];

    let logoUrl;
    let bikeImageUrl;

    if (logoRemote?.startsWith('http')) {
      try {
        const { path, url } = await uploadRemoteImage(
          `${seriesId}/constructors/${constructorId}`,
          logoRemote,
        );
        console.log(`  ↑ ${path}`);
        logoUrl = url;
        uploaded += 1;
      } catch (e) {
        console.warn(`  logo ${constructorId} skip:`, e.message);
      }
    }

    if (carRemote?.startsWith('http')) {
      try {
        const { path, url } = await uploadRemoteImage(
          `${seriesId}/cars/${constructorId}`,
          carRemote,
        );
        console.log(`  ↑ ${path}`);
        bikeImageUrl = url;
        uploaded += 1;
      } catch (e) {
        console.warn(`  car ${constructorId} skip:`, e.message);
      }
    }

    if (!logoUrl && !bikeImageUrl) continue;

    const data = {};
    if (logoUrl) data.logoUrl = logoUrl;
    if (bikeImageUrl) data.bikeImageUrl = bikeImageUrl;

    const hit = await prisma.constructorSeason.updateMany({
      where: { seasonId, constructorId },
      data,
    });
    if (hit.count > 0) dbUpdated += hit.count;
  }

  return { uploaded, dbUpdated };
}

const normalizeName = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

function hiResHeadshot(url) {
  if (!url) return null;
  if (url.includes('.transform/')) {
    return url.replace(/\.transform\/\d+col\//, '.transform/8col/');
  }
  return url;
}

async function uploadF1Media(prisma) {
  const seasonId = seasonIdFor('f1', currentSeasonYear());
  let uploaded = 0;
  let dbUpdated = 0;

  console.log('\n=== f1 constructors (logo + car) ===');
  for (const { constructorId } of F1_CONSTRUCTORS_GRID_2026) {
    const logoRemote = f1TeamShowcaseImageUrl(constructorId);
    const carRemote = f1TeamCarImageUrl(constructorId);
    let logoUrl;
    let bikeImageUrl;

    if (logoRemote) {
      try {
        const { path, url } = await uploadRemoteImage(
          `f1/constructors/${constructorId}`,
          logoRemote,
        );
        console.log(`  ↑ ${path}`);
        logoUrl = url;
        uploaded += 1;
      } catch (e) {
        console.warn(`  f1 logo ${constructorId} skip:`, e.message);
      }
    }

    if (carRemote) {
      try {
        const { path, url } = await uploadRemoteImage(`f1/cars/${constructorId}`, carRemote);
        console.log(`  ↑ ${path}`);
        bikeImageUrl = url;
        uploaded += 1;
      } catch (e) {
        console.warn(`  f1 car ${constructorId} skip:`, e.message);
      }
    }

    if (logoUrl || bikeImageUrl) {
      const data = {};
      if (logoUrl) data.logoUrl = logoUrl;
      if (bikeImageUrl) data.bikeImageUrl = bikeImageUrl;
      const hit = await prisma.constructorSeason.updateMany({
        where: { seasonId, constructorId },
        data,
      });
      if (hit.count > 0) dbUpdated += hit.count;
    }
  }

  console.log('\n=== f1 driver portraits (OpenF1) ===');
  let openF1Drivers = [];
  try {
    openF1Drivers = await getDrivers('latest');
  } catch (e) {
    console.warn('  OpenF1 drivers skip:', e.message);
  }

  for (const grid of F1_DRIVERS_GRID_2026) {
    const target = normalizeName(grid.driver);
    const family = normalizeName(grid.familyName);
    const given = normalizeName(grid.givenName);
    const match = openF1Drivers.find((d) => {
      const full = normalizeName(d.fullName);
      const last = target.split(' ').pop();
      return (
        full === target ||
        (family && (full.includes(family) || full.endsWith(family))) ||
        (given && full.includes(given) && family && full.includes(family)) ||
        (last && full.endsWith(last) && given && full.includes(given))
      );
    });
    const remote = hiResHeadshot(match?.headshotUrl);
    if (!remote?.startsWith('http')) continue;

    try {
      const { path, url } = await uploadRemoteImage(`f1/drivers/${grid.driverId}`, remote);
      console.log(`  ↑ ${path}`);
      uploaded += 1;
      await prisma.driver.upsert({
        where: { id: grid.driverId },
        create: { id: grid.driverId, headshotUrl: url },
        update: { headshotUrl: url },
      });
      const entry = await prisma.driverSeasonEntry.updateMany({
        where: { seasonId, driverId: grid.driverId },
        data: { headshotUrl: url },
      });
      if (entry.count > 0) dbUpdated += entry.count;
    } catch (e) {
      console.warn(`  f1 portrait ${grid.driverId} skip:`, e.message);
    }
  }

  return { uploaded, dbUpdated };
}

async function uploadFavicon() {
  const src = join(publicRoot, 'favicon.ico');
  const body = await readFile(src);
  const url = await uploadFile('branding/favicon.ico', body, 'image/x-icon');
  console.log('  ↑ branding/favicon.ico');
  return url;
}

async function uploadTeamBikes(prisma, seriesId, assetsMap) {
  const seasonId = seasonIdFor(seriesId, currentSeasonYear());
  let uploaded = 0;
  for (const [constructorId, assets] of Object.entries(assetsMap)) {
    if (!assets?.bikeImageUrl?.startsWith('http')) continue;
    try {
      const { path, url } = await uploadRemoteImage(
        `${seriesId}/bikes/${constructorId}`,
        assets.bikeImageUrl,
      );
      console.log(`  ↑ ${path}`);
      await prisma.constructorSeason.updateMany({
        where: { seasonId, constructorId },
        data: { bikeImageUrl: url },
      });
      uploaded += 1;
    } catch (e) {
      console.warn(`  bike ${constructorId} skip:`, e.message);
    }
  }
  return uploaded;
}

/**
 * MotoGP: motos y retratos desde Postgres (post db:sync:motogp) o Pulse si faltan.
 */
async function uploadCircuitImages(prisma, { formulaOnly = false, motoOnly = false } = {}) {
  const seriesList = formulaOnly
    ? ['f1', 'f2', 'f3']
    : motoOnly
      ? MOTO_SERIES
      : ['f1', 'f2', 'f3', ...MOTO_SERIES];
  let uploaded = 0;
  let dbUpdated = 0;

  for (const seriesId of seriesList) {
    const seasonId = seasonIdFor(seriesId, currentSeasonYear());
    const events = await prisma.event.findMany({
      where: { seasonId },
      select: {
        round: true,
        circuitId: true,
        circuitImageUrl: true,
        circuitSvgUrl: true,
      },
    });

    for (const ev of events) {
      const cid = (ev.circuitId || `round-${ev.round}`).replace(/[^a-z0-9_-]+/gi, '_');
      for (const [kind, remote] of [
        ['image', ev.circuitImageUrl],
        ['svg', ev.circuitSvgUrl],
      ]) {
        if (!needsRemoteUpload(remote)) continue;
        try {
          const { path, url } = await uploadRemoteImage(
            `${seriesId}/circuits/${cid}-${kind}`,
            remote,
          );
          console.log(`  ↑ ${path}`);
          uploaded += 1;
          const data =
            kind === 'svg' ? { circuitSvgUrl: url } : { circuitImageUrl: url };
          await prisma.event.updateMany({
            where: { seasonId, round: ev.round },
            data,
          });
          dbUpdated += 1;
        } catch (e) {
          console.warn(`  circuit ${seriesId} r${ev.round} ${kind} skip:`, e.message);
        }
      }
    }
  }

  return { uploaded, dbUpdated };
}

async function uploadMotogpBikesAndPortraits(prisma) {
  const seriesId = 'motogp';
  const seasonId = seasonIdFor(seriesId, currentSeasonYear());
  let uploaded = 0;
  let dbUpdated = 0;

  const teams = await prisma.constructorSeason.findMany({ where: { seasonId } });
  let bikeRows = teams
    .filter((t) => needsRemoteUpload(t.bikeImageUrl))
    .map((t) => ({ constructorId: t.constructorId, remoteUrl: t.bikeImageUrl }));

  const entries = await prisma.driverSeasonEntry.findMany({
    where: { seasonId },
    include: { driver: true },
  });
  let portraitRows = entries
    .map((e) => ({
      driverId: e.driverId,
      remoteUrl: e.headshotUrl ?? e.driver?.headshotUrl,
    }))
    .filter((r) => needsRemoteUpload(r.remoteUrl));

  const missingBikes = teams.length > 0 && bikeRows.length === 0 && !teams.some((t) => t.bikeImageUrl);
  const missingPortraits =
    entries.length > 0 &&
    portraitRows.length === 0 &&
    !entries.some((e) => e.headshotUrl ?? e.driver?.headshotUrl);

  if (missingBikes || missingPortraits) {
    try {
      const { fetchOfficialTeamsGrid, fetchDriverStandings } = await import(
        '../src/services/motogp/pulseLive.fetch.js'
      );
      if (missingBikes) {
        const grid = await fetchOfficialTeamsGrid(seriesId);
        bikeRows = grid
          .filter((t) => needsRemoteUpload(t.bikeImageUrl))
          .map((t) => ({ constructorId: t.constructorId, remoteUrl: t.bikeImageUrl }));
        console.log(`  (Pulse) ${bikeRows.length} motos`);
      }
      if (missingPortraits) {
        const drivers = await fetchDriverStandings(seriesId);
        portraitRows = drivers
          .map((d) => ({ driverId: d.driverId, remoteUrl: d.headshotUrl }))
          .filter((r) => needsRemoteUpload(r.remoteUrl));
        console.log(`  (Pulse) ${portraitRows.length} retratos`);
      }
    } catch (e) {
      console.warn('  Pulse fallback skip:', e.message);
    }
  }

  for (const { constructorId, remoteUrl } of bikeRows) {
    try {
      const { path, url } = await uploadRemoteImage(
        `${seriesId}/bikes/${constructorId}`,
        remoteUrl,
      );
      console.log(`  ↑ ${path}`);
      uploaded += 1;
      await prisma.constructorSeason.updateMany({
        where: { seasonId, constructorId },
        data: { bikeImageUrl: url },
      });
      dbUpdated += 1;
    } catch (e) {
      console.warn(`  motogp bike ${constructorId} skip:`, e.message);
    }
  }

  for (const { driverId, remoteUrl } of portraitRows) {
    try {
      const { path, url } = await uploadRemoteImage(`${seriesId}/drivers/${driverId}`, remoteUrl);
      console.log(`  ↑ ${path}`);
      uploaded += 1;
      await prisma.driver.upsert({
        where: { id: driverId },
        create: { id: driverId, headshotUrl: url },
        update: { headshotUrl: url },
      });
      const hit = await prisma.driverSeasonEntry.updateMany({
        where: { seasonId, driverId },
        data: { headshotUrl: url },
      });
      if (hit.count > 0) dbUpdated += hit.count;
    } catch (e) {
      console.warn(`  motogp portrait ${driverId} skip:`, e.message);
    }
  }

  return { uploaded, dbUpdated };
}

/** Retratos desde mapa curado y/o URLs ya guardadas en Postgres (Pulse). */
async function uploadMotoSeriesPortraits(prisma, seriesId, portraitMap = {}) {
  const seasonId = seasonIdFor(seriesId, currentSeasonYear());
  let uploaded = 0;
  let dbUpdated = 0;

  const entries = await prisma.driverSeasonEntry.findMany({
    where: { seasonId },
    include: { driver: true },
  });

  let pulseByDriverId = null;
  const ensurePulse = async () => {
    if (pulseByDriverId) return pulseByDriverId;
    try {
      const { fetchDriverStandings } = await import('../src/services/motogp/pulseLive.fetch.js');
      const rows = await fetchDriverStandings(seriesId);
      pulseByDriverId = Object.fromEntries(
        rows.filter((r) => r.headshotUrl).map((r) => [r.driverId, r.headshotUrl]),
      );
    } catch {
      pulseByDriverId = {};
    }
    return pulseByDriverId;
  };

  for (const e of entries) {
    let remote =
      portraitMap[e.driverId] ?? e.headshotUrl ?? e.driver?.headshotUrl ?? null;
    if (!remote?.startsWith('http')) {
      const pulse = await ensurePulse();
      remote = pulse[e.driverId] ?? null;
    }
    if (!remote?.startsWith('http')) {
      try {
        const { getRiderPortraitUrl } = await import('../src/services/motogp/motogpRiders.service.js');
        remote = (await getRiderPortraitUrl(e.driverId)) ?? null;
      } catch {
        /* sin retrato en índice global */
      }
    }
    if (!needsRemoteUpload(remote)) continue;
    try {
      const { path, url } = await uploadRemoteImage(`${seriesId}/drivers/${e.driverId}`, remote);
      console.log(`  ↑ ${path}`);
      uploaded += 1;
      await prisma.driver.upsert({
        where: { id: e.driverId },
        create: { id: e.driverId, headshotUrl: url },
        update: { headshotUrl: url },
      });
      const hit = await prisma.driverSeasonEntry.updateMany({
        where: { seasonId, driverId: e.driverId },
        data: { headshotUrl: url },
      });
      if (hit.count > 0) dbUpdated += hit.count;
    } catch (err) {
      console.warn(`  portrait ${e.driverId} skip:`, err.message);
    }
  }
  return { uploaded, dbUpdated };
}

/** Motos desde assets curados y/o bikeImageUrl en constructor_season. */
async function uploadMotoSeriesBikes(prisma, seriesId, assetsMap = {}) {
  const seasonId = seasonIdFor(seriesId, currentSeasonYear());
  let uploaded = 0;
  let dbUpdated = 0;

  const teams = await prisma.constructorSeason.findMany({ where: { seasonId } });
  for (const t of teams) {
    const fromMap = assetsMap[t.constructorId]?.bikeImageUrl;
    const remote =
      needsRemoteUpload(t.bikeImageUrl) ? t.bikeImageUrl : fromMap?.startsWith('http') ? fromMap : null;
    if (!remote?.startsWith('http') || !needsRemoteUpload(remote)) continue;
    try {
      const { path, url } = await uploadRemoteImage(`${seriesId}/bikes/${t.constructorId}`, remote);
      console.log(`  ↑ ${path}`);
      uploaded += 1;
      await prisma.constructorSeason.updateMany({
        where: { seasonId, constructorId: t.constructorId },
        data: { bikeImageUrl: url },
      });
      dbUpdated += 1;
    } catch (err) {
      console.warn(`  bike ${t.constructorId} skip:`, err.message);
    }
  }
  return { uploaded, dbUpdated };
}

async function uploadDriverPortraits(prisma, seriesId, portraitMap) {
  const seasonId = seasonIdFor(seriesId, currentSeasonYear());
  let uploaded = 0;
  let dbUpdated = 0;

  for (const [driverId, remoteUrl] of Object.entries(portraitMap)) {
    if (!remoteUrl?.startsWith('http')) continue;
    try {
      const { path, url } = await uploadRemoteImage(
        `${seriesId}/drivers/${driverId}`,
        remoteUrl,
      );
      console.log(`  ↑ ${path}`);
      uploaded += 1;

      await prisma.driver.upsert({
        where: { id: driverId },
        create: { id: driverId, headshotUrl: url },
        update: { headshotUrl: url },
      });
      const entry = await prisma.driverSeasonEntry.updateMany({
        where: { seasonId, driverId },
        data: { headshotUrl: url },
      });
      if (entry.count > 0) dbUpdated += entry.count;
    } catch (e) {
      console.warn(`  portrait ${driverId} skip:`, e.message);
    }
  }
  return { uploaded, dbUpdated };
}

async function main() {
  if (!storageConfigured()) {
    console.error(
      'Falta SUPABASE_SERVICE_ROLE_KEY en backend/.env\n' +
        'Supabase → Project Settings → API → service_role (secret)\n' +
        'SUPABASE_URL se infiere del DATABASE_URL si no lo defines.',
    );
    process.exit(1);
  }

  console.log(`Upload → ${SUPABASE_STORAGE_PUBLIC_BASE}\n`);

  const prisma = createPrismaClient();
  if (!prisma) {
    console.error('DATABASE_URL no configurada');
    process.exit(1);
  }

  let totalUp = 0;
  let totalDb = 0;

  try {
    if (motogpOnly) {
      console.log('\n=== motogp bikes + portraits ===');
      const mgp = await uploadMotogpBikesAndPortraits(prisma);
      totalUp += mgp.uploaded;
      totalDb += mgp.dbUpdated;
      console.log(`\nDone — ${totalUp} uploads, ${totalDb} DB updates.`);
      return;
    }

    if (motoOnly) {
      for (const seriesId of MOTO_SERIES) {
        console.log(`\n=== ${seriesId} logos ===`);
        const { uploaded, urlByConstructor } = await uploadSeriesLogos(seriesId);
        totalUp += uploaded;
        totalDb += await updateDbLogos(prisma, seriesId, urlByConstructor);
      }

      console.log('\n=== motogp bikes + portraits ===');
      const mgp = await uploadMotogpBikesAndPortraits(prisma);
      totalUp += mgp.uploaded;
      totalDb += mgp.dbUpdated;

      console.log('\n=== moto2 media ===');
      const m2b = await uploadMotoSeriesBikes(prisma, 'moto2', MOTO2_TEAM_ASSETS);
      const m2p = await uploadMotoSeriesPortraits(prisma, 'moto2', MOTO2_DRIVER_PORTRAIT_URL);
      totalUp += m2b.uploaded + m2p.uploaded;
      totalDb += m2b.dbUpdated + m2p.dbUpdated;

      console.log('\n=== moto3 media ===');
      const m3b = await uploadMotoSeriesBikes(prisma, 'moto3', MOTO3_TEAM_ASSETS);
      const m3p = await uploadMotoSeriesPortraits(prisma, 'moto3', MOTO3_DRIVER_PORTRAIT_URL);
      totalUp += m3b.uploaded + m3p.uploaded;
      totalDb += m3b.dbUpdated + m3p.dbUpdated;

      console.log('\n=== circuit images (MotoGP/Moto2/Moto3) ===');
      const circ = await uploadCircuitImages(prisma, { motoOnly: true });
      totalUp += circ.uploaded;
      totalDb += circ.dbUpdated;
      console.log(`\nDone — ${totalUp} uploads, ${totalDb} DB updates.`);
      return;
    }

    if (circuitsOnly) {
      const label = formulaOnly ? 'F1/F2/F3' : motoOnly ? 'MotoGP/Moto2/Moto3' : 'all series';
      console.log(`\n=== circuit images (${label}) ===`);
      const circ = await uploadCircuitImages(prisma, { formulaOnly, motoOnly });
      console.log(`\nDone — ${circ.uploaded} uploads, ${circ.dbUpdated} DB updates.`);
      return;
    }

    console.log('\n=== branding ===');
    await uploadFavicon();
    totalUp += 1;

    if (!skipMoto) {
    for (const seriesId of SERIES) {
      console.log(`\n=== ${seriesId} ===`);
      const { uploaded, urlByConstructor } = await uploadSeriesLogos(seriesId);
      const dbUpdated = await updateDbLogos(prisma, seriesId, urlByConstructor);
      totalUp += uploaded;
      totalDb += dbUpdated;
      console.log(`  ${uploaded} logos, ${dbUpdated} constructor_season rows`);
    }

    console.log('\n=== motogp bikes + portraits ===');
    const mgp = await uploadMotogpBikesAndPortraits(prisma);
    totalUp += mgp.uploaded;
    totalDb += mgp.dbUpdated;
    console.log(`  ${mgp.uploaded} uploads, ${mgp.dbUpdated} DB rows`);

    console.log('\n=== moto2 bikes ===');
    totalUp += await uploadTeamBikes(prisma, 'moto2', MOTO2_TEAM_ASSETS);

    console.log('\n=== moto3 bikes ===');
    totalUp += await uploadTeamBikes(prisma, 'moto3', MOTO3_TEAM_ASSETS);

    console.log('\n=== moto2 driver portraits ===');
    const m2p = await uploadDriverPortraits(prisma, 'moto2', MOTO2_DRIVER_PORTRAIT_URL);
    totalUp += m2p.uploaded;
    totalDb += m2p.dbUpdated;
    console.log(`  ${m2p.uploaded} portraits, ${m2p.dbUpdated} season entries`);

    console.log('\n=== moto3 driver portraits ===');
    const m3p = await uploadDriverPortraits(prisma, 'moto3', MOTO3_DRIVER_PORTRAIT_URL);
    totalUp += m3p.uploaded;
    totalDb += m3p.dbUpdated;
    console.log(`  ${m3p.uploaded} portraits, ${m3p.dbUpdated} season entries`);
    } else {
      console.log('\n  (--skip-moto: omitiendo logos/bikes/retratos Moto)');
    }

    const f1 = await uploadF1Media(prisma);
    totalUp += f1.uploaded;
    totalDb += f1.dbUpdated;
    console.log(`  f1: ${f1.uploaded} uploads, ${f1.dbUpdated} DB rows`);

    console.log('\n=== f2 media ===');
    const f2c = await uploadConstructorMedia(prisma, 'f2', F2_TEAM_LOGO_URL, F2_TEAM_CAR_URL);
    totalUp += f2c.uploaded;
    totalDb += f2c.dbUpdated;
    const f2p = await uploadDriverPortraits(prisma, 'f2', F2_DRIVER_HEADSHOT_URL);
    totalUp += f2p.uploaded;
    totalDb += f2p.dbUpdated;
    console.log(`  f2: ${f2c.uploaded + f2p.uploaded} uploads, ${f2c.dbUpdated + f2p.dbUpdated} DB rows`);

    console.log('\n=== f3 media ===');
    const f3c = await uploadConstructorMedia(prisma, 'f3', F3_TEAM_LOGO_URL, F3_TEAM_CAR_URL);
    totalUp += f3c.uploaded;
    totalDb += f3c.dbUpdated;
    const f3p = await uploadDriverPortraits(prisma, 'f3', F3_DRIVER_HEADSHOT_URL);
    totalUp += f3p.uploaded;
    totalDb += f3p.dbUpdated;
    console.log(`  f3: ${f3c.uploaded + f3p.uploaded} uploads, ${f3c.dbUpdated + f3p.dbUpdated} DB rows`);

    console.log(`\n=== circuit images (${skipMoto ? 'F1/F2/F3' : 'all series'}) ===`);
    const circ = await uploadCircuitImages(prisma, { formulaOnly: skipMoto || formulaOnly });
    totalUp += circ.uploaded;
    totalDb += circ.dbUpdated;
    console.log(`  ${circ.uploaded} uploads, ${circ.dbUpdated} event fields`);

    console.log(`\nDone — ${totalUp} uploads, ${totalDb} DB updates.`);
    console.log('Ejemplo URL:', publicStorageUrl('moto2/constructors/red-bull-ktm-ajo.jpg'));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
