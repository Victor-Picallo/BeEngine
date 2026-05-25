const params = new URLSearchParams({
  action: 'query',
  generator: 'search',
  gsrsearch: 'OnlyFans American Racing Team',
  gsrnamespace: '6',
  gsrlimit: '15',
  prop: 'imageinfo',
  iiprop: 'url|mime',
  format: 'json',
});
const j = await (
  await fetch('https://commons.wikimedia.org/w/api.php?' + params, {
    headers: { 'User-Agent': 'BeEngine/1.0 (moto2-logos)' },
  })
).json();
for (const p of Object.values(j.query?.pages ?? {})) {
  const url = p.imageinfo?.[0]?.url;
  const mime = p.imageinfo?.[0]?.mime;
  if (mime?.includes('svg') || mime?.includes('png') || (mime?.includes('jpeg') && /logo|team|racing/i.test(p.title))) {
    console.log(p.title, mime, url);
  }
}
