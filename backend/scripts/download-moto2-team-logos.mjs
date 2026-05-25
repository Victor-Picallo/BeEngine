/**
 * Descarga logos oficiales del grid Moto2 2026 (14 equipos).
 * Prioridad: webs oficiales de equipos → Wikimedia Commons → TheSportsDB.
 * Salida: frontend/public/moto2/teams/<slug>.png|.svg|.jpg
 *
 * Uso: node scripts/download-moto2-team-logos.mjs
 *      FORCE=1 node scripts/download-moto2-team-logos.mjs  (sobrescribe existentes)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchTheSportsDbTeamLogo } from './fetch-thesportsdb-team-logo.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../frontend/public/moto2/teams');
const motogpDir = path.resolve(__dirname, '../../frontend/public/motogp/teams');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BeEngine-moto2-logos';
const FORCE = process.env.FORCE === '1' || process.env.FORCE === 'true';

/** slug Pulse → { file, urls[], thesportsdbId?, copyFromMotogp? } */
const TEAMS = [
  {
    slug: 'blu-cru-pramac-yamaha-moto2',
    file: 'blu-cru-pramac-yamaha-moto2.png',
    thesportsdbId: 151122,
    urls: [
      'https://www.pramacracing.com/wp-content/uploads/2026/01/PRAMAC_Moto2_2026.png',
      'https://www.pramacracing.com/wp-content/uploads/2025/02/pramacracing_logo_mtogp.png',
    ],
  },
  {
    slug: 'cfmoto-aspar-team',
    file: 'cfmoto-aspar-team.png',
    thesportsdbId: 136177,
    urls: [
      'https://upload.wikimedia.org/wikipedia/commons/a/a4/Aspar_Team.png',
      'https://upload.wikimedia.org/wikipedia/commons/e/ed/Logo_2020_cfmoto.jpg',
    ],
  },
  {
    slug: 'elf-marc-vds-racing-team',
    file: 'elf-marc-vds-racing-team.png',
    thesportsdbId: 148669,
    urls: [
      'https://marcvds.com/wp-content/themes/marcVDS/images/logo-team-vds.png',
      'https://marcvds.com/wp-content/themes/marcVDS/images/logo-mvds.svg',
    ],
  },
  {
    slug: 'idemitsu-honda-team-asia',
    file: 'idemitsu-honda-team-asia.png',
    thesportsdbId: 135533,
    copyFromMotogp: ['honda-hrc-castrol.png'],
    urls: ['https://upload.wikimedia.org/wikipedia/commons/8/82/Honda_HRC_Castrol_logo_%284%29.png'],
  },
  {
    slug: 'italjet-gresini-moto2',
    file: 'italjet-gresini-moto2.png',
    thesportsdbId: 151123,
    urls: [
      'https://www.gresiniracing.com/wp-content/themes/gresini-racing-2025/images/moto2-gresini-2025.png',
      'https://www.gresiniracing.com/wp-content/uploads/2025/01/moto2-gresini-2025.png',
      'https://www.gresiniracing.com/wp-content/themes/gresini-racing-2025/images/logo.svg',
    ],
  },
  {
    slug: 'italtrans-racing-team',
    file: 'italtrans-racing-team.png',
    thesportsdbId: 135530,
    urls: [
      'https://italtransracingteam.com/wp-content/uploads/2025/02/logo_moto2_3.png',
      'https://italtransracingteam.com/wp-content/uploads/2020/10/logo-footer.png',
    ],
  },
  {
    slug: 'klint-racing-team',
    file: 'klint-racing-team.png',
    thesportsdbId: 135517,
    urls: ['https://r2.thesportsdb.com/images/media/team/logo/3v4xqq1568128615.png'],
  },
  {
    slug: 'liqui-moly-dynavolt-intact-gp',
    file: 'liqui-moly-dynavolt-intact-gp.svg',
    thesportsdbId: 135522,
    urls: [
      'https://www.intactgp.de/media/logo_liquimoly_intactgp_husqvarna.svg',
      'https://r2.thesportsdb.com/images/media/team/logo/cb0h9t1739915268.png',
    ],
  },
  {
    slug: 'momoven-idrofoglia-rw-racing-team',
    file: 'momoven-idrofoglia-rw-racing-team.png',
    thesportsdbId: 137265,
    urls: ['https://r2.thesportsdb.com/images/media/team/logo/0uxni31568816269.png'],
  },
  {
    slug: 'onlyfans-american-racing-team',
    file: 'onlyfans-american-racing-team.png',
    thesportsdbId: 137264,
    urls: ['https://r2.thesportsdb.com/images/media/team/logo/ylcqsb1568898100.png'],
  },
  {
    slug: 'qj-motor-galfer-msi',
    file: 'qj-motor-galfer-msi.png',
    thesportsdbId: 148670,
    urls: [
      'https://msiracingteam.com/wp-content/uploads/2026/02/logo_msiracingteam.png',
      'https://msiracingteam.com/wp-content/uploads/2026/02/logo_msiracingteam_fn.png',
    ],
  },
  {
    slug: 'red-bull-ktm-ajo',
    file: 'red-bull-ktm-ajo.png',
    thesportsdbId: 135519,
    urls: [
      'https://upload.wikimedia.org/wikipedia/commons/7/7c/Ajo_Motorsport_Logo_2020.jpg',
      'https://r2.thesportsdb.com/images/media/team/logo/dd3hkd1568043427.png',
    ],
    copyFromMotogp: ['red-bull-ktm-factory-racing.png'],
  },
  {
    slug: 'reds-fantic-racing',
    file: 'reds-fantic-racing.png',
    thesportsdbId: 137268,
    urls: [
      'https://r2.thesportsdb.com/images/media/team/logo/z2ytkv1720021850.png',
      'https://www.gresiniracing.com/wp-content/themes/gresini-racing-2025/images/moto2-gresini-2025.png',
    ],
  },
  {
    slug: 'speedrs-team',
    file: 'speedrs-team.png',
    thesportsdbId: 135531,
    urls: [
      'https://www.speedupracing.com/wp-content/uploads/2020/03/Logo-PNG.png',
      'https://www.speedupracing.com/wp-content/uploads/2020/03/cropped-Logo-PNG-1.png',
    ],
  },
];

fs.mkdirSync(outDir, { recursive: true });

const fetchOne = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || ct.includes('text/html')) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 400) return null;
  return buf;
};

const extFromUrl = (url, fallbackFile) => {
  const m = url.match(/\.(svg|png|jpe?g|webp)(?:\?|$)/i);
  if (m) return m[1].toLowerCase().replace('jpeg', 'jpg');
  return path.extname(fallbackFile).slice(1) || 'png';
};

const writeTeam = (team, buf, source) => {
  fs.writeFileSync(path.join(outDir, team.file), buf);
  console.log('OK', team.file, buf.length, source);
};

for (const team of TEAMS) {
  const dest = path.join(outDir, team.file);
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 2000 && !dest.endsWith('.svg')) {
    const isBadge = fs.readFileSync(dest, 'utf8').includes('<svg') && fs.readFileSync(dest, 'utf8').includes('font-family');
    if (!isBadge) {
      console.log('SKIP', team.file);
      continue;
    }
    console.log('REPLACE badge', team.file);
  }

  let ok = false;

  for (const url of team.urls) {
    try {
      const buf = await fetchOne(url);
      if (!buf) {
        console.log('SKIP', team.slug, url.slice(0, 72));
        continue;
      }
      const ext = extFromUrl(url, team.file);
      if (ext !== path.extname(team.file).slice(1)) {
        team.file = team.slug + '.' + ext;
      }
      writeTeam(team, buf, url.slice(0, 72));
      ok = true;
      break;
    } catch (e) {
      console.log('ERR', team.slug, e.message);
    }
  }
  if (ok) continue;

  for (const src of team.copyFromMotogp ?? []) {
    const from = path.join(motogpDir, src);
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, dest);
      console.log('COPY motogp', team.file, '<-', src);
      ok = true;
      break;
    }
  }
  if (ok) continue;

  if (team.thesportsdbId) {
    try {
      const logoUrl = await fetchTheSportsDbTeamLogo(team.thesportsdbId);
      if (logoUrl) {
        const buf = await fetchOne(logoUrl);
        if (buf) {
          const ext = extFromUrl(logoUrl, team.file);
          team.file = team.slug + '.' + ext;
          writeTeam(team, buf, 'TheSportsDB ' + logoUrl.slice(-40));
          ok = true;
        }
      }
    } catch (e) {
      console.log('ERR sportsdb', team.slug, e.message);
    }
  }

  if (!ok) console.log('FAIL', team.slug);
}

// Eliminar badges SVG generados si tenemos PNG equivalente
for (const team of TEAMS) {
  const png = path.join(outDir, team.file);
  const svg = path.join(outDir, team.slug + '.svg');
  if (fs.existsSync(png) && fs.existsSync(svg)) {
    fs.unlinkSync(svg);
    console.log('DEL badge', team.slug + '.svg');
  }
}

// Sincronizar extensiones en moto2TeamLogos.js no automático — mantener .png en mapa
console.log('\nFiles:', fs.readdirSync(outDir).sort().join(', '));
