/**
 * Descarga logos reales MotoGP → frontend/public/motogp/teams/
 * Fuentes: Wikimedia (commons/en) + webs oficiales cuando responden.
 *
 * Uso: node backend/scripts/download-motogp-all-logos.mjs
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../frontend/public/motogp/teams');
const UA = 'BeEngine/1.0 (motogp-logos; +https://github.com/)';

const wiki = (name) => {
  const h = crypto.createHash('md5').update(name).digest('hex');
  return `https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(name)}`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*,*/*' },
    redirect: 'follow',
  });
  const ct = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok || ct.includes('text/html') || buf.length < 400) return null;
  return buf;
}

async function wikiMediaLogo(pageTitle) {
  await sleep(3000);
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(pageTitle)}`,
    { headers: { 'User-Agent': UA } },
  );
  if (!res.ok) return [];
  const json = await res.json();
  const out = [];
  for (const item of json.items ?? []) {
    if (item.type !== 'image') continue;
    let src = item.original?.source ?? item.srcset?.[item.srcset.length - 1]?.src;
    if (src?.startsWith('//')) src = `https:${src}`;
    if (src && /logo/i.test(`${item.title} ${src}`)) out.push(src);
  }
  return out;
}

/** @type {{ file: string, urls: string[], wiki?: string }[]} */
const TEAMS = [
  {
    file: 'aprilia-racing.svg',
    urls: [wiki('Aprilia_Racing_Logo.svg'), 'https://upload.wikimedia.org/wikipedia/commons/8/82/Aprilia_Racing_Logo.svg'],
  },
  {
    file: 'ducati-lenovo.png',
    urls: [wiki('Ducati_Lenovo_Team_-_2024_logo.png')],
  },
  {
    file: 'honda-hrc.png',
    urls: [wiki('Honda_HRC_Castrol_logo_(4).png')],
  },
  {
    file: 'lcr-honda.png',
    urls: [wiki('PATA_Honda_-_Ten_Kate_Racing_-_Logo.png')],
    wiki: 'LCR_(team)',
  },
  {
    file: 'yamaha-racing.png',
    urls: ['https://upload.wikimedia.org/wikipedia/en/6/64/Yamaha_motogp_team.png'],
    wiki: 'Monster_Energy_Yamaha_MotoGP',
  },
  {
    file: 'vr46.png',
    urls: [
      wiki('Pertamina_Enduro_VR46_Racing_Team_-_logo_2024_updated.jpg'),
      'https://upload.wikimedia.org/wikipedia/commons/a/ab/Pertamina_Enduro_VR46_Racing_Team_-_logo_2024_updated.jpg',
    ],
    wiki: 'VR46_Racing_Team',
  },
  {
    file: 'gresini.png',
    urls: ['https://www.gresiniracing.com/wp-content/themes/gresini-racing-2025/images/logo.svg'],
    wiki: 'Gresini_Racing',
  },
  {
    file: 'pramac.png',
    urls: [
      'https://www.pramacracing.com/wp-content/uploads/2025/02/pramacracing_logo_mtogp.png',
      'https://upload.wikimedia.org/wikipedia/en/thumb/1/1d/Prima_Pramac_Racing_logo.jpg/1280px-Prima_Pramac_Racing_logo.jpg',
    ],
    wiki: 'Pramac_Racing',
  },
  {
    file: 'ktm-factory.png',
    urls: ['https://upload.wikimedia.org/wikipedia/en/a/a8/Red_Bull_KTM_Factory_Racing_logo.jpg'],
    wiki: 'Red_Bull_KTM_Factory_Racing',
  },
  {
    file: 'tech3.png',
    urls: ['https://upload.wikimedia.org/wikipedia/en/a/a8/Red_Bull_KTM_Factory_Racing_logo.jpg'],
    wiki: 'Red_Bull_KTM_Tech3',
  },
  {
    file: 'trackhouse.png',
    urls: [
      'https://upload.wikimedia.org/wikipedia/en/thumb/d/d2/Trackhouse_Racing_Logo.png/1280px-Trackhouse_Racing_Logo.png',
    ],
    wiki: 'Trackhouse_Racing',
  },
];

fs.mkdirSync(outDir, { recursive: true });

for (const team of TEAMS) {
  const dest = path.join(outDir, team.file);
  let ok = false;
  for (const url of team.urls) {
    await sleep(2000);
    try {
      const buf = await download(url);
      if (buf) {
        fs.writeFileSync(dest, buf);
        console.log('OK', team.file, buf.length, url.slice(0, 72));
        ok = true;
        break;
      }
    } catch (e) {
      console.log('  err', team.file, e.message);
    }
  }
  if (!ok && team.wiki) {
    const candidates = await wikiMediaLogo(team.wiki);
    for (const url of candidates) {
      try {
        const buf = await download(url);
        if (buf) {
          fs.writeFileSync(dest, buf);
          console.log('OK wiki', team.file, buf.length);
          ok = true;
          break;
        }
      } catch (_) {}
      await sleep(1500);
    }
  }
  if (!ok) console.log('FAIL', team.file);
}

fs.copyFileSync(path.join(outDir, 'honda-hrc.png'), path.join(outDir, 'castrol-honda-lcr.png'));
fs.copyFileSync(path.join(outDir, 'yamaha-racing.png'), path.join(outDir, 'yamaha-factory-racing.png'));
console.log('\nAlias: castrol-honda-lcr.png, yamaha-factory-racing.png');
console.log('Files:', fs.readdirSync(outDir).sort().join(', '));
