const sites = [
  ['trackhouse', 'https://www.trackhouse.com/'],
  ['lcr', 'https://www.lcrracing.it/'],
  ['tech3', 'https://www.tech3racing.com/'],
  ['ktm-factory', 'https://www.ktm.com/int-en/motogp/red-bull-ktm-factory-racing/'],
  ['yamaha', 'https://www.yamaha-racing.com/motogp/'],
];

const pick = (html, base) => {
  const out = [];
  for (const m of html.matchAll(/(?:src|href)=["']([^"']+\.(?:png|svg|webp)(?:\?[^"']*)?)/gi)) {
    let u = m[1];
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u.startsWith('/')) u = new URL(u, base).href;
    if (/logo|brand|team|lcr|tech|ktm|yamaha|monster|trackhouse|racing/i.test(u)) out.push(u);
  }
  const og = html.match(/property="og:image" content="([^"]+)"/i)?.[1];
  if (og) out.unshift(og);
  return [...new Set(out)].slice(0, 12);
};

for (const [name, url] of sites) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
    });
    const html = await res.text();
    console.log('\n===', name, res.status, res.url, '===');
    for (const u of pick(html, res.url)) console.log(' ', u);
  } catch (e) {
    console.log(name, 'ERR', e.message);
  }
}
