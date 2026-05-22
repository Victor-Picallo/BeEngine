const slugs = [
  'trackhouse-racing',
  'lcr-honda',
  'red-bull-ktm-factory-racing',
  'red-bull-ktm-tech3',
  'aprilia-racing',
];

for (const s of slugs) {
  try {
    const r = await fetch(`https://www.motogp.com/en/teams/${s}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    const h = await r.text();
    const imgs = [
      ...h.matchAll(/https?:\/\/[^"'\s]+\.(?:png|svg|webp)/gi),
    ]
      .map((m) => m[0])
      .filter((u) => /logo|team|brand|constructor/i.test(u));
    console.log('\n', s, r.status);
    [...new Set(imgs)].slice(0, 8).forEach((u) => console.log(' ', u));
  } catch (e) {
    console.log(s, e.message);
  }
}
