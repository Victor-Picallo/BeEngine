const UA = 'BeEngine/1.0 (motogp-logos)';

async function commonsSearch(query) {
  await new Promise((r) => setTimeout(r, 2500));
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: '900',
    format: 'json',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': UA },
  });
  const json = await res.json();
  const pages = Object.values(json.query?.pages ?? {});
  return pages
    .filter((p) => p.imageinfo?.[0]?.url && /logo/i.test(p.title))
    .map((p) => ({ title: p.title, url: p.imageinfo[0].url, mime: p.imageinfo[0].mime }));
}

const queries = [
  'Red Bull KTM Factory Racing logo',
  'Red Bull KTM Tech3 logo',
  'Trackhouse Racing logo',
  'Monster Energy Yamaha MotoGP logo',
  'Gresini Racing logo',
  'LCR Honda logo',
];

for (const q of queries) {
  const hits = await commonsSearch(q);
  console.log('\n===', q);
  for (const h of hits.slice(0, 5)) console.log(' ', h.title.replace('File:', ''), '\n   ', h.url);
}
