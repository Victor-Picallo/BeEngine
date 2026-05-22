const candidates = [
  ['vr46-wiki', 'https://upload.wikimedia.org/wikipedia/en/2/2e/VR46_Racing_logo.png'],
  ['trackhouse-wiki', 'https://upload.wikimedia.org/wikipedia/en/8/8f/Trackhouse_Racing_logo.png'],
  ['lcr-wiki', 'https://upload.wikimedia.org/wikipedia/en/9/9c/LCR_Honda_logo.png'],
  ['gresini-wiki', 'https://upload.wikimedia.org/wikipedia/en/8/8a/Gresini_Racing_logo.png'],
  ['pramac-wiki', 'https://upload.wikimedia.org/wikipedia/en/4/4e/Pramac_Racing_logo.png'],
  ['ducati-lenovo', 'https://www.ducaticorse.com/wp-content/themes/ducati-corse/assets/img/logo-ducati-lenovo.svg'],
  ['ducati-lenovo2', 'https://www.ducati.com/content/dam/ducati/regions/global/racing/motogp/lenovo/lenovo-ducati-logo.png'],
  ['monster-yamaha', 'https://www.yamaha-racing.com/assets/images/logo.svg'],
  ['monster-yamaha2', 'https://racing.yamaha-motor.eu/assets/img/logo-yamaha-racing.svg'],
  ['ktm-rb', 'https://www.redbull.com/images/logo-red-bull-ktm.svg'],
  ['tech3', 'https://tech3racing.com/wp-content/uploads/2019/05/logo-tech3.svg'],
  ['aprilia-racing', 'https://www.aprilia.com/content/dam/aprilia/regions/global/logo-aprilia-racing-mgp.svg'],
  ['aprilia-racing2', 'https://racing.aprilia.com/wp-content/uploads/logo-aprilia-racing.svg'],
  ['lcr', 'https://www.lcrhonda.it/wp-content/uploads/2021/06/logo-lcr.svg'],
  ['trackhouse', 'https://trackhousemoto.com/wp-content/uploads/2024/01/trackhouse-logo.svg'],
];

for (const [name, url] of candidates) {
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    console.log(name, r.status, r.headers.get('content-type'));
  } catch (e) {
    console.log(name, 'ERR');
  }
}
