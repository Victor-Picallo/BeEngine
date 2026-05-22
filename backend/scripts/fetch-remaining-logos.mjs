import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../frontend/public/motogp/teams');

const SOURCES = [
  ['aprilia-racing.svg', 'https://upload.wikimedia.org/wikipedia/commons/8/82/Aprilia_Racing_Logo.svg'],
  ['lcr.svg', 'https://www.lcrhonda.it/wp-content/uploads/2021/06/logo-lcr.svg'],
  ['lcr.png', 'https://www.lcrhonda.it/wp-content/uploads/2020/06/logo-lcr-negativo.png'],
  ['tech3.svg', 'https://tech3factoryracing.com/wp-content/uploads/2019/05/logo-tech3-racing.svg'],
  ['tech3.png', 'https://tech3factoryracing.com/wp-content/uploads/2019/05/logo-tech3-racing.png'],
  [
    'trackhouse.svg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Trackhouse_Racing_logo.svg/320px-Trackhouse_Racing_logo.svg.png',
  ],
  ['trackhouse.png', 'https://static.cdnlogo.com/logos/t/45/trackhouse-racing.png'],
  ['ktm-factory.svg', 'https://static.cdnlogo.com/logos/r/47/red-bull-ktm-factory-racing.svg'],
  ['ktm-factory.png', 'https://static.cdnlogo.com/logos/r/47/red-bull-ktm-factory-racing.png'],
  ['tech3-wiki.svg', 'https://upload.wikimedia.org/wikipedia/commons/e/e2/GasGas_Factory_Racing_Tech3_logo.png'],
];

fs.mkdirSync(outDir, { recursive: true });

for (const [file, url] of SOURCES) {
  if (fs.existsSync(path.join(outDir, file))) {
    console.log('SKIP exists', file);
    continue;
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (BeEngine)' },
      redirect: 'follow',
    });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || ct.includes('text/html')) {
      console.log('NO', file, res.status, ct.split(';')[0]);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) {
      console.log('NO', file, 'tiny');
      continue;
    }
    fs.writeFileSync(path.join(outDir, file), buf);
    console.log('OK', file, buf.length);
  } catch (e) {
    console.log('ERR', file, e.message);
  }
  await new Promise((r) => setTimeout(r, 800));
}

console.log('\n', fs.readdirSync(outDir).join(', '));
