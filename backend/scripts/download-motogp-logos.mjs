import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../frontend/public/motogp/teams');

const wiki = (name) => {
  const h = crypto.createHash('md5').update(name).digest('hex');
  return `https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(name)}`;
};

/** Archivo local → URL (Wikimedia u oficial del equipo). */
const SOURCES = {
  'vr46.png': wiki('Pertamina_Enduro_VR46_Racing_Team_-_logo_2024_updated.jpg'),
  'gresini.svg': 'https://www.gresiniracing.com/wp-content/themes/gresini-racing-2025/images/logo.svg',
  'pramac.png': 'https://www.pramacracing.com/wp-content/uploads/2025/02/pramacracing_logo_mtogp.png',
  'ducati-lenovo.png': wiki('Ducati_Lenovo_Team_-_2024_logo.png'),
  'honda-hrc.png': wiki('Honda_HRC_Castrol_logo_(4).png'),
  'aprilia-racing.svg': wiki('Aprilia_Racing_Logo.svg'),
  'pramac-wiki.png': wiki('Pramac_Racing-Logo.png'),
  'yamaha-racing.svg': wiki('Yamaha_Motor_Racing_logo.svg'),
  'gresini-wordmark.png': wiki('Gresini_Racing_-_blue_wordmark_-_ca._2010s.png'),
  'red-bull.svg': wiki('RED_BULL_LOGO_2026.svg'),
  'ktm-racing.svg': wiki('KTM_Bike_Industries_ArtWW.svg'),
  'lcr-honda.png': wiki('PATA_Honda_-_Ten_Kate_Racing_-_Logo.png'),
  'tech3-gasgas.png': wiki('GasGas_Factory_Racing_Tech3_logo.png'),
  'trackhouse.png': wiki('Tricon_Garage_Logo.png'),
};

fs.mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = {};

for (const [file, url] of Object.entries(SOURCES)) {
  await sleep(600);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (BeEngine MotoGP)' },
      redirect: 'follow',
    });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || ct.includes('text/html')) {
      console.log('SKIP', file, res.status, ct.split(';')[0]);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 150) {
      console.log('SKIP', file, 'small', buf.length);
      continue;
    }
    fs.writeFileSync(path.join(outDir, file), buf);
    results[file] = { ok: true, bytes: buf.length };
    console.log('OK', file, buf.length);
  } catch (e) {
    console.log('ERR', file, e.message);
  }
}

console.log('\nSaved:', Object.keys(results).join(', '));
console.log('Dir:', fs.readdirSync(outDir).join(', '));
