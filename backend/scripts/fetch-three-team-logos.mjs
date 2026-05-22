import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../frontend/public/motogp/teams');

const UA = 'BeEngine/1.0 (motogp-logos; local-dev)';

async function download(url, file) {
  const dest = path.join(outDir, file);
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const ct = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok || buf.length < 400 || ct.includes('text/html')) {
    console.log('NO', file, res.status, buf.length, ct.split(';')[0]);
    return false;
  }
  fs.writeFileSync(dest, buf);
  console.log('OK', file, buf.length);
  return true;
}

async function wikiThumb(title, file) {
  const api =
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
    '&prop=pageimages&format=json&pithumbsize=600';
  const res = await fetch(api, { headers: { 'User-Agent': UA } });
  const json = await res.json();
  const page = Object.values(json.query?.pages ?? {})[0];
  const src = page?.thumbnail?.source;
  if (!src) {
    console.log('no wiki thumb', title);
    return false;
  }
  return download(src, file);
}

fs.mkdirSync(outDir, { recursive: true });

const yamahaSrc = path.join(outDir, 'yamaha-racing.svg');
const yamahaDest = path.join(outDir, 'yamaha-factory-racing.svg');
if (fs.existsSync(yamahaSrc)) {
  fs.copyFileSync(yamahaSrc, yamahaDest);
  console.log('OK yamaha-factory-racing.svg (copy)');
}

await wikiThumb('LCR (team)', 'lcr-honda.png');
await new Promise((r) => setTimeout(r, 2000));

if (!fs.existsSync(path.join(outDir, 'lcr-honda.png'))) {
  await download(
    'https://upload.wikimedia.org/wikipedia/commons/5/54/Honda_HRC_Castrol_logo_(4).png',
    'lcr-honda.png',
  );
}

if (!fs.existsSync(path.join(outDir, 'castrol-honda-lcr.png'))) {
  const lcr = path.join(outDir, 'lcr-honda.png');
  if (fs.existsSync(lcr)) {
    fs.copyFileSync(lcr, path.join(outDir, 'castrol-honda-lcr.png'));
    console.log('OK castrol-honda-lcr.png (copy lcr-honda)');
  }
}

await wikiThumb('Yamaha Motor Racing', 'yamaha-factory-racing.png');
await new Promise((r) => setTimeout(r, 2000));

if (!fs.existsSync(path.join(outDir, 'yamaha-factory-racing.png')) && fs.existsSync(yamahaDest)) {
  console.log('yamaha-factory-racing uses svg copy only');
}

console.log('\nFiles:', fs.readdirSync(outDir).sort().join(', '));
