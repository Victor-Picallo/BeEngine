import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../frontend/public/motogp/teams');

const FILES = [
  ['honda-hrc', 'Honda Racing logo (2022).svg'],
  ['aprilia-racing', 'Aprilia logo.svg'],
  ['ducati', 'Ducati Motor Holding logo.svg'],
  ['ktm', 'KTM-Logo.svg'],
  ['yamaha', 'Yamaha Motor Racing logo.svg'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wikiUrl(filename) {
  await sleep(1500);
  const u =
    'https://commons.wikimedia.org/w/api.php?action=query&titles=File:' +
    encodeURIComponent(filename) +
    '&prop=imageinfo&iiprop=url&format=json';
  const j = await fetch(u, { headers: { 'User-Agent': 'BeEngine/1.0' } }).then((r) => r.json());
  const page = Object.values(j.query?.pages ?? {})[0];
  return page?.imageinfo?.[0]?.url ?? null;
}

fs.mkdirSync(outDir, { recursive: true });

for (const [slug, file] of FILES) {
  const url = await wikiUrl(file);
  console.log(slug, url ?? 'MISS');
  if (!url) continue;
  const ext = file.endsWith('.svg') ? 'svg' : 'png';
  const res = await fetch(url);
  if (!res.ok) continue;
  fs.writeFileSync(path.join(outDir, `${slug}.${ext}`), Buffer.from(await res.arrayBuffer()));
}
