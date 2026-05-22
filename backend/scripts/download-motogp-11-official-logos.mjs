/**
 * Descarga logos oficiales de los 11 equipos del grid MotoGP 2026.
 * Salida: frontend/public/motogp/teams/<slug>.png|.svg
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../frontend/public/motogp/teams');
const UA = 'BeEngine/1.0 (motogp-official-logos)';

const wikiCommons = (name) => {
  const h = crypto.createHash('md5').update(name).digest('hex');
  return `https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(name)}`;
};

const wikiEn = (pathPart) => `https://upload.wikimedia.org/wikipedia/en/${pathPart}`;

/** Los 11 equipos oficiales Pulse Live 2026 */
const OFFICIAL_TEAMS = [
  {
    slug: 'aprilia-racing',
    file: 'aprilia-racing.svg',
    urls: [
      wikiCommons('Aprilia_Racing_Logo.svg'),
      'https://upload.wikimedia.org/wikipedia/commons/8/82/Aprilia_Racing_Logo.svg',
    ],
  },
  {
    slug: 'bk8-gresini-racing-motogp',
    file: 'bk8-gresini-racing-motogp.png',
    wiki: 'Gresini_Racing',
    urls: [
      'https://www.gresiniracing.com/wp-content/themes/gresini-racing-2025/images/motogp-gresini-2025.png',
      'https://www.gresiniracing.com/wp-content/uploads/2025/02/motogp-gresini-2025-new.png',
      'https://www.gresiniracing.com/wp-content/themes/gresini-racing-2025/images/logo.png',
    ],
  },
  {
    slug: 'ducati-lenovo-team',
    file: 'ducati-lenovo-team.png',
    urls: [wikiCommons('Ducati_Lenovo_Team_-_2024_logo.png')],
  },
  {
    slug: 'honda-hrc-castrol',
    file: 'honda-hrc-castrol.png',
    urls: [wikiCommons('Honda_HRC_Castrol_logo_(4).png')],
  },
  {
    slug: 'lcr-honda',
    file: 'lcr-honda.png',
    wiki: 'LCR_(team)',
    urls: [
      'https://www.lcr.mc/wp-content/uploads/2018/01/lcr-logo-retina.png',
      'https://upload.wikimedia.org/wikipedia/en/1/13/LCR_logo_2021.png',
      'https://www.lcr.mc/wp-content/uploads/2018/01/lcr-logo-white.png',
    ],
  },
  {
    slug: 'monster-energy-yamaha-motogp',
    file: 'monster-energy-yamaha-motogp.png',
    urls: [
      wikiEn('6/64/Yamaha_motogp_team.png'),
      wikiCommons('Yamaha_Motor_Racing_logo.svg'),
    ],
  },
  {
    slug: 'pertamina-enduro-vr46-racing-team',
    file: 'pertamina-enduro-vr46-racing-team.png',
    urls: [
      wikiCommons('Pertamina_Enduro_VR46_Racing_Team_-_logo_2024_updated.jpg'),
      'https://upload.wikimedia.org/wikipedia/commons/a/ab/Pertamina_Enduro_VR46_Racing_Team_-_logo_2024_updated.jpg',
    ],
  },
  {
    slug: 'prima-pramac-yamaha-motogp',
    file: 'prima-pramac-yamaha-motogp.jpg',
    wiki: 'Pramac_Racing',
    urls: [
      wikiEn('1/1d/Prima_Pramac_Racing_logo.jpg'),
      wikiEn('thumb/1/1d/Prima_Pramac_Racing_logo.jpg/1280px-Prima_Pramac_Racing_logo.jpg'),
      'https://www.pramacracing.com/wp-content/uploads/2025/02/pramacracing_logo_mtogp.png',
    ],
  },
  {
    slug: 'red-bull-ktm-factory-racing',
    file: 'red-bull-ktm-factory-racing.png',
    wiki: 'Red_Bull_KTM_Factory_Racing',
    urls: [wikiEn('a/a8/Red_Bull_KTM_Factory_Racing_logo.jpg')],
  },
  {
    slug: 'red-bull-ktm-tech3',
    file: 'red-bull-ktm-tech3.png',
    wiki: 'Red_Bull_KTM_Tech3',
    urls: [
      wikiCommons('GasGas_Factory_Racing_Tech3_logo.png'),
      'https://upload.wikimedia.org/wikipedia/commons/4/4a/GasGas_Factory_Racing_Tech3_logo.png',
      wikiEn('thumb/8/8e/Red_Bull_KTM_Tech3_logo.png/800px-Red_Bull_KTM_Tech3_logo.png'),
      wikiEn('8/8e/Red_Bull_KTM_Tech3_logo.png'),
    ],
  },
  {
    slug: 'trackhouse-motogp-team',
    file: 'trackhouse-motogp-team.png',
    wiki: 'Trackhouse_Racing',
    urls: [
      wikiEn('thumb/d/d2/Trackhouse_Racing_Logo.png/1280px-Trackhouse_Racing_Logo.png'),
      wikiEn('a/a7/Trackhouse_Racing_MotoGP_logo.jpg'),
    ],
  },
];

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
  await sleep(2500);
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

fs.mkdirSync(outDir, { recursive: true });

// Limpiar logos viejos que no son de los 11 oficiales
const keep = new Set(OFFICIAL_TEAMS.map((t) => t.file));
for (const f of fs.readdirSync(outDir)) {
  if (!keep.has(f)) {
    fs.unlinkSync(path.join(outDir, f));
    console.log('DEL', f);
  }
}

for (const team of OFFICIAL_TEAMS) {
  const dest = path.join(outDir, team.file);
  let ok = false;
  for (const url of team.urls) {
    await sleep(2000);
    try {
      const buf = await download(url);
      if (buf) {
        fs.writeFileSync(dest, buf);
        console.log('OK', team.file, buf.length);
        ok = true;
        break;
      }
    } catch (e) {
      console.log('  err', e.message);
    }
  }
  if (!ok && team.wiki) {
    for (const url of await wikiMediaLogo(team.wiki)) {
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
  if (!ok && team.slug === 'red-bull-ktm-tech3') {
    const factory = path.join(outDir, 'red-bull-ktm-factory-racing.png');
    if (fs.existsSync(factory)) {
      fs.copyFileSync(factory, dest);
      console.log('OK copy factory →', team.file);
      ok = true;
    }
  }
  if (!ok) console.log('FAIL', team.slug);
}

console.log('\nFinal:', fs.readdirSync(outDir).sort().join(', '));
