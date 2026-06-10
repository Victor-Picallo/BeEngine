import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPrismaClient } from '../src/lib/prisma.js';
import { uploadFile, mimeForFile } from '../src/lib/supabaseStorage.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function main() {
  const prisma = createPrismaClient();
  const driverId = 'arvid_lindblad';
  
  try {
    const src = join(root, 'frontend', 'public', 'drivers', 'arvid-lindblad-official.webp');
    const body = await readFile(src);
    const mime = mimeForFile(src);
    
    // We can upload it as 'f2/drivers/arvid_lindblad.webp' or similar, 
    // but the fallback uses `arvid_lindblad`.
    // Let's check if the driver exists in DB
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      console.log(`Driver ${driverId} not found in DB. I will create him or just upload the file.`);
    }

    const storagePath = `f1/drivers/${driverId}.webp`;
    const url = await uploadFile(storagePath, body, mime);
    
    console.log(`Uploaded to ${url}`);
    
    // Update DB
    if (driver) {
      await prisma.driver.update({
        where: { id: driverId },
        data: { headshotUrl: url }
      });
      console.log(`Updated DB driver.headshotUrl to ${url}`);

      // Update SeasonEntries too?
      await prisma.driverSeasonEntry.updateMany({
        where: { driverId },
        data: { headshotUrl: url }
      });
      console.log(`Updated DB driverSeasonEntry.headshotUrl to ${url}`);
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
