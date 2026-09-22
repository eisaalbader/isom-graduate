#!/usr/bin/env node
/* Assemble the planner from the very pages the booklet is printed from.
   Nothing is re-drawn here: the markup, the CSS and the wire router all come
   straight out of ../guide, so the map on the phone is the map on the sheet. */
const fs = require('fs'), path = require('path');
/* the printed guide: this app is assembled out of it, never a copy of it */
const ROOT = path.resolve(__dirname, '..');
const G = path.join(ROOT, 'guide');
const ASSETS = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/assets.json'), 'utf8'));
const PLAN   = fs.readFileSync(path.join(__dirname, 'src/plan.json'), 'utf8');

/* --- the page CSS, with the printer's local fonts swapped for web ones --- */
let css = fs.readFileSync(path.join(G, 'src/guide.css'), 'utf8');
/* The printer's own font files, carried into the page. No outside request:
   the map on the phone is set in exactly the type the sheet is set in. */
const FONTS = [
  ['Aleo',    400, 'normal', 'aleo/files/aleo-latin-400-normal.woff2'],
  ['Aleo',    700, 'normal', 'aleo/files/aleo-latin-700-normal.woff2'],
  ['Aleo',    400, 'italic', 'aleo/files/aleo-latin-400-italic.woff2'],
  ['BarlowC', 700, 'italic', 'barlow-condensed/files/barlow-condensed-latin-700-italic.woff2'],
  ['BarlowC', 600, 'normal', 'barlow-condensed/files/barlow-condensed-latin-600-normal.woff2'],
  ['DMSans',  400, 'normal', 'dm-sans/files/dm-sans-latin-400-normal.woff2'],
  ['DMSans',  500, 'normal', 'dm-sans/files/dm-sans-latin-500-normal.woff2'],
  ['DMSans',  700, 'normal', 'dm-sans/files/dm-sans-latin-700-normal.woff2'],
  ['Cairo',   600, 'normal', 'cairo/files/cairo-arabic-600-normal.woff2'],
  ['Cairo',   700, 'normal', 'cairo/files/cairo-arabic-700-normal.woff2'],
  ['Tajawal', 400, 'normal', 'tajawal/files/tajawal-arabic-400-normal.woff2'],
  ['Tajawal', 500, 'normal', 'tajawal/files/tajawal-arabic-500-normal.woff2'],
  ['Tajawal', 700, 'normal', 'tajawal/files/tajawal-arabic-700-normal.woff2'],
];
const faces = FONTS.map(([fam, w, sty, f]) => {
  const b64 = fs.readFileSync(path.join(ROOT, 'node_modules/@fontsource', f)).toString('base64');
  return `@font-face{font-family:${fam};font-weight:${w};font-style:${sty};font-display:swap;` +
         `src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
}).join('\n');
css = css.replace(/@font-face\{[^}]*\}\n?/g, '');
{ const b = fs.readFileSync(path.join(G, 'build.js'), 'utf8');
  const e = b.match(/const EXTRA_CSS = `([\s\S]*?)`;/);
  if (e) css += '\n' + e[1]; }
/* The sheet's stylesheet is scoped to the sheet. Without this its class names
   collide with the app's own — .maj on the transfer page turned the major
   picker into a flex row and folded the cards in half. */
function scope(src, sel) {
  let out = '', i = 0;
  const readBlock = (j) => { let d = 0, k = j;
    for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return k; } }
    return k; };
  while (i < src.length) {
    const open = src.indexOf('{', i);
    if (open < 0) { out += src.slice(i); break; }
    const head = src.slice(i, open).trim();
    const close = readBlock(open);
    const body = src.slice(open + 1, close);
    if (/^@media\s+print/i.test(head)) { /* screen only — drop it */ }
    else if (/^@(media|supports)/i.test(head)) out += head + '{' + scope(body, sel) + '}\n';
    else if (/^@font-face/i.test(head) || head === ':root') out += head + '{' + body + '}\n';
    else if (/^(html\s*,\s*body|body|html)$/.test(head)) { /* the app owns the document */ }
    else if (head === '*') out += head + '{' + body + '}\n';
    else out += head.split(',').map(x => sel + ' ' + x.trim()).join(',') + '{' + body + '}\n';
    i = close + 1;
  }
  return out;
}
/* comments would otherwise be swallowed into the next selector */
css = css.replace(/\/\*[\s\S]*?\*\//g, '');
css = faces + '\n' + scope(css, '.stage');

/* --- each page's markup and its wire list --- */
const PAGES = {};
if (!fs.existsSync(path.join(G, 'dist', 'mis.html'))) {
  console.error("run `npm run sheets` first — the planner is built from the guide's own pages");
  process.exit(1);
}
for (const n of ['mis', 'oscm', 'general', 'electives']) {
  const h = fs.readFileSync(path.join(G, 'dist', n + '.html'), 'utf8');
  const m = h.match(/<section class="page"[\s\S]*?<\/section>/);
  if (!m) throw new Error('no page markup in ' + n);
  let html = m[0];
  for (const k of Object.keys(ASSETS)) html = html.split('../assets/' + k).join('@@' + k);
  const w = h.match(/window\.__WIRES__=(\[[\s\S]*?\]);/);
  PAGES[n] = { html, wires: w ? w[1] : '[]' };
}
const wireJs = (() => {
  const b = fs.readFileSync(path.join(G, 'build.js'), 'utf8');
  const m = b.match(/const WIRE_JS = `([\s\S]*?)`;/);
  if (!m) throw new Error('no wire router');
  return m[1].replace(/\\`/g, '`').replace(/\\\$/g, '$')
    .replace("if(document.readyState==='complete') draw(); else window.addEventListener('load',draw);",
             'window.__drawWires=draw;');
})();

const shell = fs.readFileSync(path.join(__dirname, 'src/shell.html'), 'utf8');
const out = shell
  .replace('/*__PAGECSS__*/', css)
  .replace('__PAGES__', JSON.stringify(PAGES))
  .replace('__PLAN__', PLAN)
  .replace('__ASSETS__', JSON.stringify(ASSETS))
  .replace('/*__WIREJS__*/', wireJs);
const OUT = path.join(ROOT, 'public');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), out);
console.log('public/index.html', (out.length / 1024).toFixed(0) + ' KB');
