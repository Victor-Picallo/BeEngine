import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../frontend/public/motogp/teams');
const UA = 'BeEngine/1.0 (motogp-logos)';

/** Wikipedia article → output file */
const WIKI_PAGES = [
  ['Red_Bull_KTM_Factory_Racing', 'ktm-factory.png'],
  ['Red_Bull_KTM_Tech3', 'tech3.png'],
  ['Tech3', 'tech3.png'],
  ['GasGas_Factory_Racing', 'tech3.png'],
  ['Pertamina_Enduro_VR46', 'vr46.png'],
  ['VR46_Racing_Team', 'vr46.png'],
  ['Trackhouse_Racing', 'trackhouse.png'],
  ['Monster_Energy_Yamaha_MotoGP', 'yamaha-racing.png'],
  ['Gresini_Racing', 'gresini.png'],
  ['LCR_(team)', 'lcr-honda.png'],
  ['VR46_Racing', 'vr46.png'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mediaFromWiki(title) {
  await sleep(3000);
  const url = `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return [];
  const json = await res.json();
  const items = json.items ?? [];
  const out = [];
  for (const item of items) {
    if (item.type !== 'image') continue;
    let src = item.srcset?.[item.srcset.length - 1]?.src ?? item.original?.source;
    if (src?.startsWith('//')) src = `https:${src}`;
    const title = item.title ?? '';
    if (src && /logo|Logo|wordmark|brand/i.test(title + src)) {
      out.push({ title, src });
    }
  }
  return out;
}

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const ct = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok || ct.includes('text/html') || buf.length < 500) return null;
  return buf;
}

fs.mkdirSync(outDir, { recursive: true });

for (const [wikiTitle, file] of WIKI_PAGES) {
  const dest = path.join(outDir, file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 8000) {
    console.log('SKIP exists', file);
    continue;
  }
  const media = await mediaFromWiki(wikiTitle);
  console.log('\n', wikiTitle, '→', media.length, 'candidates');
  let ok = false;
  for (const m of media) {
    console.log('  try', m.title, m.src.slice(0, 70));
    try {
      const buf = await download(m.src);
      if (buf) {
        fs.writeFileSync(dest, buf);
        console.log('OK', file, buf.length);
        ok = true;
        break;
      }
    } catch (e) {
      console.log('  err', e.message);
    }
    await sleep(1500);
  }
  if (!ok) console.log('FAIL', file);
}
