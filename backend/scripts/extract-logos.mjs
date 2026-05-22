const sites = {
  ducati: 'https://www.ducati.com/ww/en/racing/motogp/team.html',
  yamaha: 'https://www.yamaha-motor.com/motogp/',
  ktm: 'https://www.ktm.com/motogp/red-bull-ktm-factory-racing/',
  tech3: 'https://tech3racing.com/en/',
  lcr: 'https://www.lcrhonda.it/en/',
  trackhouse: 'https://trackhousemoto.com/',
  aprilia: 'https://www.aprilia.com/en_EN/racing/motogp.html',
};

for (const [name, url] of Object.entries(sites)) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
    });
    const base = res.url;
    const html = await res.text();
    const found = new Set();
    for (const m of html.matchAll(/(?:src|href|content)=["']([^"']+)["']/gi)) {
      let u = m[1];
      if (u.startsWith('//')) u = 'https:' + u;
      else if (u.startsWith('/')) u = new URL(u, base).href;
      else if (!u.startsWith('http')) continue;
      if (/\.(svg|png|webp)(\?|$)/i.test(u) && /logo|brand|team|racing|lenovo|monster|tech|lcr|track|aprilia|ducati|yamaha|ktm|hrc/i.test(u)) {
        found.add(u.split('?')[0] + (u.includes('?') ? '?' + u.split('?')[1] : ''));
      }
    }
    console.log('\n===', name, res.status, base, '===');
    [...found].slice(0, 12).forEach((u) => console.log(u));
  } catch (e) {
    console.log(name, e.message);
  }
}
