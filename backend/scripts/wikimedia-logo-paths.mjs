import crypto from 'crypto';

const candidates = [
  ['vr46', 'Pertamina_Enduro_VR46_Racing_Team_-_logo_2024_updated.jpg'],
  ['gresini', 'Gresini_Racing_logo.svg'],
  ['gresini2', 'Gresini_Racing_MotoGP_logo.png'],
  ['pramac', 'Pramac_Racing-Logo.png'],
  ['ducati', 'Ducati_Lenovo_Team_-_2024_logo.png'],
  ['honda-hrc', 'Honda_HRC_Castrol_logo_(4).png'],
  ['lcr', 'LCR_Honda_logo.svg'],
  ['lcr2', 'LCR_Honda_logo.png'],
  ['lcr3', 'LCR_Team_logo.png'],
  ['yamaha', 'Monster_Energy_Yamaha_MotoGP_logo.svg'],
  ['yamaha2', 'Monster_Energy_Yamaha_MotoGP_logo.png'],
  ['yamaha3', 'Monster_Energy_Yamaha_logo.svg'],
  ['ktm-f', 'Red_Bull_KTM_Factory_Racing_logo.svg'],
  ['ktm-f2', 'Red_Bull_KTM_Factory_Racing_logo.png'],
  ['ktm-f3', 'Red_Bull_KTM_MotoGP_Team_logo.png'],
  ['tech3', 'Tech3_Racing_logo.svg'],
  ['tech3b', 'Red_Bull_KTM_Tech3_logo.svg'],
  ['tech3c', 'Tech_3_Racing_logo.png'],
  ['trackhouse', 'Trackhouse_MotoGP_Team_logo.png'],
  ['trackhouse2', 'Trackhouse_Racing_logo.svg'],
  ['aprilia', 'Aprilia_Racing_logo.svg'],
  ['aprilia2', 'Aprilia_Racing_Team_logo.png'],
  ['aprilia3', 'Aprilia_Racing_MotoGP_logo.png'],
];

const pathFor = (name) => {
  const h = crypto.createHash('md5').update(name).digest('hex');
  return `https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(name)}`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [key, name] of candidates) {
  await sleep(400);
  const url = pathFor(name);
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'BeEngine/1.0' } });
    if (res.ok) console.log('OK', key, name, url);
    else console.log('NO', key, res.status, name);
  } catch (e) {
    console.log('ERR', key, e.message);
  }
}
