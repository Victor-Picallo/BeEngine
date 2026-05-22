const sites = [
  ['VR46', 'https://www.vr46.com/'],
  ['VR46 racing', 'https://racing.vr46.com/'],
  ['Gresini', 'https://www.gresiniracing.com/'],
  ['Pramac', 'https://www.pramacracing.com/'],
  ['Trackhouse', 'https://www.trackhouse.com/'],
  ['LCR', 'https://www.lcrracing.it/'],
  ['Aprilia Racing', 'https://www.aprilia.com/en_EN/racing/motogp/aprilia-racing/'],
  ['Ducati Corse', 'https://www.ducati.com/ww/en/racing/motogp/team'],
  ['Honda HRC', 'https://www.honda.co.jp/HRC-en/'],
  ['Yamaha Racing', 'https://www.yamaha-motor.eu/motogp/'],
  ['KTM MotoGP', 'https://www.ktm.com/motogp/'],
  ['Tech3 KTM', 'https://tech3factoryracing.com/'],
  ['Red Bull KTM', 'https://www.redbull.com/int-en/motorsports/red-bull-ktm'],
];

const pick = (html, base) => {
  const out = [];
  for (const m of html.matchAll(/(?:src|href)=["']([^"']+\.(?:png|svg|webp)(?:\?[^"']*)?)/gi)) {
    let u = m[1];
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u.startsWith('/')) u = new URL(u, base).href;
    if (/logo|brand|team|vr46|gresini|pramac|trackhouse|lcr|hrc|lenovo|monster|tech3|ktm|racing/i.test(u)) {
      out.push(u);
    }
  }
  const og = html.match(/property="og:image" content="([^"]+)"/i)?.[1];
  if (og) out.unshift(og);
  return [...new Set(out)].slice(0, 8);
};

for (const [name, url] of sites) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      redirect: 'follow',
    });
    const html = await res.text();
    const logos = pick(html, res.url);
    console.log('\n===', name, res.status, '===');
    for (const u of logos) console.log(' ', u);
  } catch (e) {
    console.log(name, 'ERR', e.message);
  }
}
