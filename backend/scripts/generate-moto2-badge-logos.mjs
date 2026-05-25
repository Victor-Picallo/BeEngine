/**
 * Genera SVG de marca para equipos Moto2 sin asset oficial descargado.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../frontend/public/moto2/teams');

const TEAMS = [
  { slug: 'cfmoto-aspar-team', label: 'ASP', color: '#E30613', text: '#fff' },
  { slug: 'elf-marc-vds-racing-team', label: 'MVD', color: '#00A651', text: '#fff' },
  { slug: 'italtrans-racing-team', label: 'ITR', color: '#1B365D', text: '#fff' },
  { slug: 'klint-racing-team', label: 'KLT', color: '#111111', text: '#fff' },
  { slug: 'liqui-moly-dynavolt-intact-gp', label: 'INT', color: '#FFD100', text: '#111' },
  { slug: 'momoven-idrofoglia-rw-racing-team', label: 'RW', color: '#0057B8', text: '#fff' },
  { slug: 'onlyfans-american-racing-team', label: 'AMR', color: '#1E3A8A', text: '#fff' },
  { slug: 'qj-motor-galfer-msi', label: 'MSI', color: '#111111', text: '#fff' },
  { slug: 'reds-fantic-racing', label: 'FAN', color: '#E4002B', text: '#fff' },
  { slug: 'speedrs-team', label: 'SPD', color: '#003DA5', text: '#fff' },
];

fs.mkdirSync(outDir, { recursive: true });

const svg = (label, bg, fg) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img">
  <rect width="320" height="200" rx="16" fill="${bg}"/>
  <text x="160" y="118" text-anchor="middle" font-family="system-ui,Segoe UI,Arial,sans-serif" font-size="72" font-weight="700" fill="${fg}">${label}</text>
</svg>`;

for (const t of TEAMS) {
  const dest = path.join(outDir, `${t.slug}.svg`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 500) {
    console.log('SKIP', t.slug);
    continue;
  }
  fs.writeFileSync(dest, svg(t.label, t.color, t.text));
  console.log('WROTE', t.slug);
}
