import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../frontend/public/motogp/teams');

/** Descarga logos de equipo (no fabricante). */
const SOURCES = [
  { file: 'vr46.png', url: 'https://vr46.com/cdn/shop/files/LOGHI-ai_420x.png?v=1648048359' },
  { file: 'gresini.svg', url: 'https://www.gresiniracing.com/wp-content/themes/gresini-racing-2025/images/logo.svg' },
  { file: 'pramac.png', url: 'https://www.pramacracing.com/wp-content/uploads/2025/02/pramacracing_logo_mtogp.png' },
  { file: 'honda-hrc.png', url: 'https://www.honda.co.jp/motor/motorsports/image/hrc-logo.png' },
  {
    file: 'ducati-lenovo.png',
    url: 'https://www.ducati.com/content/dam/ducati/regions/global/motogp/team/lenovo/Ducati-Lenovo-Team-logo.png',
  },
  {
    file: 'ducati-lenovo.png',
    url: 'https://www.ducaticorse.com/wp-content/uploads/2024/11/ducati-lenovo-team-logo.png',
  },
  {
    file: 'monster-yamaha.png',
    url: 'https://www.yamaha-motor.eu/content/dam/yamaha-motor-racing/motogp/team/logo-monster-energy-yamaha-motogp.png',
  },
  {
    file: 'monster-yamaha.png',
    url: 'https://racing.yamaha-motor.eu/assets/images/logo-monster-energy-yamaha-motogp.png',
  },
  { file: 'lcr.png', url: 'https://www.lcrracing.it/wp-content/uploads/2020/06/logo-lcr-negativo.png' },
  { file: 'lcr.png', url: 'https://lcrracing.com/wp-content/uploads/2019/05/logo-lcr.png' },
  {
    file: 'ktm-factory.png',
    url: 'https://www.redbull.com/content/dam/redbullcom/images/motorsports/motogp/2024/ktm/red-bull-ktm-factory-racing-logo.png',
  },
  {
    file: 'ktm-factory.png',
    url: 'https://img.redbull.com/images/tm/fallbackimage/default-logo.png',
  },
  { file: 'tech3.png', url: 'https://tech3racing.com/wp-content/uploads/2019/05/logo-tech3-racing.png' },
  { file: 'tech3.png', url: 'https://www.tech3racing.com/wp-content/uploads/2020/11/logo-tech3-racing.svg' },
  {
    file: 'trackhouse.png',
    url: 'https://trackhousemoto.com/wp-content/uploads/2024/01/cropped-Trackhouse-MotoGP-Logo.png',
  },
  {
    file: 'trackhouse.png',
    url: 'https://www.trackhouse.com/wp-content/uploads/2022/03/Trackhouse-Logo-Primary-Black.png',
  },
  {
    file: 'aprilia-racing.svg',
    url: 'https://www.aprilia.com/content/dam/aprilia/regions/global/racing/motogp/logo-aprilia-racing.svg',
  },
  {
    file: 'aprilia-racing.png',
    url: 'https://racing.aprilia.com/wp-content/uploads/sites/3/2024/01/logo-aprilia-racing.png',
  },
];

fs.mkdirSync(outDir, { recursive: true });

const done = new Set();

for (const { file, url } of SOURCES) {
  if (done.has(file)) continue;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (BeEngine MotoGP logos)' },
      redirect: 'follow',
    });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || ct.includes('text/html')) {
      console.log('SKIP', file, res.status, ct.split(';')[0]);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) {
      console.log('SKIP', file, 'tiny', buf.length);
      continue;
    }
    fs.writeFileSync(path.join(outDir, file), buf);
    done.add(file);
    console.log('OK', file, buf.length, url.slice(0, 70));
  } catch (e) {
    console.log('ERR', file, e.message);
  }
}

console.log('\nFiles:', fs.readdirSync(outDir).join(', '));
