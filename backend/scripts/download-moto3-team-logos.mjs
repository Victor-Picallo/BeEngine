/**
 * Descarga logos oficiales del grid Moto3 2026 (13 equipos).
 * Prioridad: webs oficiales → Wikimedia → TheSportsDB → copia Moto2/MotoGP.
 * Salida: frontend/public/moto3/teams/<slug>.png|.svg|.jpg
 *
 * Uso: node backend/scripts/download-moto3-team-logos.mjs
 *      FORCE=1 node backend/scripts/download-moto3-team-logos.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchTheSportsDbTeamLogo } from './fetch-thesportsdb-team-logo.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../frontend/public/moto3/teams');
const moto2Dir = path.resolve(__dirname, '../../frontend/public/moto2/teams');
const motogpDir = path.resolve(__dirname, '../../frontend/public/motogp/teams');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BeEngine-moto3-logos';
const FORCE = process.env.FORCE === '1' || process.env.FORCE === 'true';

/** slug Pulse → fuentes */
const TEAMS = [
  {
    slug: 'cfmoto-gaviota-aspar-team',
    file: 'cfmoto-gaviota-aspar-team.png',
    thesportsdbId: 137282,
    urls: [
      'https://r2.thesportsdb.com/images/media/team/badge/ww80ej1720528918.png',
      'https://r2.thesportsdb.com/images/media/team/logo/emz2751720528872.png',
      'https://teamaspar.com/bundles/motogp/img/assets/logo_sponsor-moto-3.png',
    ],
    copyFromMoto2: ['cfmoto-aspar-team.png'],
  },
  {
    slug: 'leopard-racing',
    file: 'leopard-racing.svg',
    urls: [
      'https://leopardracing.com/wp-content/uploads/2024/02/logo_leopard_racing_w.svg',
    ],
    patchWhiteToDark: true,
  },
  {
    slug: 'red-bull-ktm-ajo',
    file: 'red-bull-ktm-ajo.png',
    thesportsdbId: 135519,
    urls: ['https://r2.thesportsdb.com/images/media/team/logo/dd3hkd1568043427.png'],
    copyFromMoto2: ['red-bull-ktm-ajo.jpg'],
  },
  {
    slug: 'liqui-moly-dynavolt-intact-gp',
    file: 'liqui-moly-dynavolt-intact-gp.svg',
    copyFromMoto2: ['liqui-moly-dynavolt-intact-gp.svg'],
    thesportsdbId: 135522,
    urls: ['https://www.intactgp.de/media/logo_liquimoly_intactgp_husqvarna.svg'],
  },
  {
    slug: 'red-bull-ktm-tech3',
    file: 'red-bull-ktm-tech3.png',
    copyFromMotogp: ['red-bull-ktm-tech3.png'],
    thesportsdbId: 135520,
  },
  {
    slug: 'honda-team-asia',
    file: 'honda-team-asia.png',
    thesportsdbId: 135533,
    urls: [
      'https://upload.wikimedia.org/wikipedia/commons/8/82/Honda_HRC_Castrol_logo_%284%29.png',
    ],
    copyFromMoto2: ['idemitsu-honda-team-asia.png'],
  },
  {
    slug: 'level-up-mta',
    file: 'level-up-mta.png',
    urls: [
      'https://www.levelup-mta.com/wordpress/wp-content/uploads/2026/05/logo-big-UZ-1.png',
      'https://www.levelup-mta.com/wordpress/wp-content/uploads/2025/03/LOGO-LV-UP_26_bianco_new.png',
    ],
  },
  {
    slug: 'cip-green-power',
    file: 'cip-green-power.png',
    thesportsdbId: 135544,
    urls: ['https://r2.thesportsdb.com/images/media/team/logo/pmhlsw1568991530.png'],
  },
  {
    slug: 'aeon-credit-mt-helmets-msi',
    file: 'aeon-credit-mt-helmets-msi.png',
    thesportsdbId: 148670,
    urls: [
      'https://msiracingteam.com/wp-content/uploads/2026/02/logo_msiracingteam.png',
      'https://msiracingteam.com/wp-content/uploads/2026/02/logo_msiracingteam_fn.png',
    ],
  },
  {
    slug: 'gryd-mlav-racing',
    file: 'gryd-mlav-racing.png',
    thesportsdbId: 148719,
    urls: ['https://mlavracing.com/wp-content/uploads/2025/02/gryd-mlav-logo.jpg'],
  },
  {
    slug: 'sic58-squadra-corse',
    file: 'sic58-squadra-corse.svg',
    urls: ['https://www.sic58squadracorse.it/wp-content/uploads/2022/03/logo.svg'],
    patchWhiteToDark: true,
  },
  {
    slug: 'rivacold-snipers-team',
    file: 'rivacold-snipers-team.png',
    thesportsdbId: 137271,
  },
  {
    slug: 'code-motorsports',
    file: 'code-motorsports.png',
    thesportsdbId: 137273,
    urls: [
      'https://r2.thesportsdb.com/images/media/team/logo/nw1sra1772451852.png',
      'https://codemotorsports.com/cdn/shop/files/CODE_MOTORSPORTS_MAIN_ITALICS_LOGO.png?v=1755560302&width=600',
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
  const dest = path.join(outDir, team.file);
  fs.writeFileSync(dest, buf);
  if (team.patchWhiteToDark && team.file.endsWith('.svg')) {
    let svg = fs.readFileSync(dest, 'utf8');
    svg = svg.replace(/#FFFFFF/gi, '#111111');
    fs.writeFileSync(dest, svg);
  }
  console.log('OK', team.file, buf.length, source);
};

for (const team of TEAMS) {
  const dest = path.join(outDir, team.file);
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 2000) {
    console.log('SKIP', team.file);
    continue;
  }

  let ok = false;

  for (const url of team.urls ?? []) {
    try {
      const buf = await fetchOne(url);
      if (!buf) {
        console.log('SKIP', team.slug, url.slice(0, 80));
        continue;
      }
      const ext = extFromUrl(url, team.file);
      if (ext !== path.extname(team.file).slice(1)) {
        team.file = `${team.slug}.${ext}`;
      }
      writeTeam(team, buf, url.slice(0, 80));
      ok = true;
      break;
    } catch (e) {
      console.log('ERR', team.slug, e.message);
    }
  }
  if (ok) continue;

  for (const src of team.copyFromMoto2 ?? []) {
    const from = path.join(moto2Dir, src);
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, dest);
      console.log('COPY moto2', team.file, '<-', src);
      ok = true;
      break;
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
          team.file = `${team.slug}.${ext}`;
          writeTeam(team, buf, `TheSportsDB ${logoUrl.slice(-40)}`);
          ok = true;
        }
      }
    } catch (e) {
      console.log('ERR sportsdb', team.slug, e.message);
    }
  }

  if (!ok) console.log('FAIL', team.slug);
}

console.log('\nFiles:', fs.readdirSync(outDir).sort().join(', '));
