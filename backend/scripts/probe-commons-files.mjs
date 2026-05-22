import crypto from 'crypto';

const files = [
  'Aprilia_Racing_Logo.svg',
  'GasGas_Factory_Racing_Tech3_logo.png',
  'Castrol_Honda_LCR_logo.png',
  'LCR_Honda_Castrol_logo.png',
  'Trackhouse_MotoGP_Team_logo_2024.png',
  'Red_Bull_KTM_Tech3_logo_2024.png',
  'Red_Bull_KTM_Factory_Racing_logo_2024.svg',
  'Red_Bull_KTM_Tech3_logo.svg',
  'Logo_Tech3_Racing.svg',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const f of files) {
  await sleep(1000);
  const h = crypto.createHash('md5').update(f).digest('hex');
  const url = `https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(f)}`;
  const r = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'BeEngine/1.0' } });
  console.log(r.status, f);
}
