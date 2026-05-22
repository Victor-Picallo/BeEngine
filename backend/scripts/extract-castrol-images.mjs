const res = await fetch(
  'https://www.castrol.com/en/global/corporate/about-castrol/corporate-partnerships/lcr-honda-castrol-motogp-team.html',
  { headers: { 'User-Agent': 'Mozilla/5.0' } },
);
const html = await res.text();
const imgs = [...html.matchAll(/https?:\/\/[^"'\s]+\.(?:png|jpg|webp|svg)/gi)].map((m) => m[0]);
[...new Set(imgs)]
  .filter((u) => /castrol|honda|lcr|motogp/i.test(u))
  .slice(0, 20)
  .forEach((u) => console.log(u));
