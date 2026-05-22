import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../frontend/public/motogp/teams');

const pick = (html, base) => {
  const out = [];
  for (const m of html.matchAll(/(?:src|href|content)=["']([^"']+\.(?:png|svg|webp)(?:\?[^"']*)?)/gi)) {
    let u = m[1];
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u.startsWith('/')) u = new URL(u, base).href;
    if (/logo|brand|team|tech|lcr|track|ktm|gasgas|redbull|red-bull/i.test(u)) out.push(u);
  }
  return [...new Set(out)];
};

const pages = [
  ['gasgas-tech3', 'https://www.gasgas.com/en/motogp/red-bull-gasgas-tech3'],
  ['gasgas2', 'https://www.gasgas.com/en/racing/motogp'],
  ['redbull-ktm', 'https://www.redbull.com/int-en/motorsports/red-bull-ktm-motogp'],
  ['redbull2', 'https://www.redbull.com/us-en/motorsports/motogp'],
];

for (const [name, url] of pages) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
    });
    console.log('\n===', name, res.status, '===');
    const html = await res.text();
    pick(html, res.url).slice(0, 15).forEach((u) => console.log(' ', u));
  } catch (e) {
    console.log(name, e.message);
  }
}

const direct = [
  ['tech3.png', 'https://www.gasgas.com/content/dam/gasgas/global/motogp/tech3/logo-tech3-racing.png'],
  ['ktm-factory.png', 'https://www.gasgas.com/content/dam/gasgas/global/motogp/factory/logo-red-bull-ktm.png'],
  ['lcr.png', 'https://www.castrol.com/content/dam/castrol/corporate/images/motorsport/lcr-honda-logo.png'],
  ['trackhouse.png', 'https://media.gettyimages.com/photos/trackhouse-logo-picture-id123456'],
];

fs.mkdirSync(outDir, { recursive: true });
for (const [file, url] of direct) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.ok && !(res.headers.get('content-type') || '').includes('html')) {
      fs.writeFileSync(path.join(outDir, file), Buffer.from(await res.arrayBuffer()));
      console.log('SAVED', file);
    }
  } catch (_) {}
}
