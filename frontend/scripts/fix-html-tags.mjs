import fs from 'node:fs';

const open = '<' + 'div ';
const close = '</' + 'div>';

for (const file of process.argv.slice(2)) {
  let html = fs.readFileSync(file, 'utf8');
  html = html.replaceAll('</motion>', close);
  html = html.replaceAll('<motion ', open);
  fs.writeFileSync(file, html);
  console.log('fixed', file);
}
