#!/usr/bin/env node
/* The planner's icons and its link preview, drawn from the guide's own parts:
   the club mark, the cover's drawing of the degree, and the sheet's type.

     public/og.png                1200 x 630, the card WhatsApp and others show under a shared link
     public/apple-touch-icon.png  180 x 180, the icon when the site is added to a phone's home screen
     public/favicon-32.png        32 x 32, the browser tab

   Run after the club mark changes:  node app/icons.js  (then rebuild the planner) */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..'), G = path.join(ROOT, 'guide'), OUT = path.join(ROOT, 'public');
const PINNED = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const LAUNCH = { args: ['--no-sandbox', '--font-render-hinting=none'] };
if (fs.existsSync(PINNED)) LAUNCH.executablePath = PINNED;

const b64 = f => fs.readFileSync(f).toString('base64');
const font = (fam, w, sty, f, range) => `@font-face{font-family:${fam};font-weight:${w};font-style:${sty};` +
  (range ? `unicode-range:${range};` : '') +
  `src:url(data:font/woff2;base64,${b64(path.join(ROOT, 'node_modules/@fontsource', f))}) format('woff2')}`;
/* the same two halves the sheet loads for its Arabic fonts (see guide.css) */
const css = fs.readFileSync(path.join(G, 'src/guide.css'), 'utf8');
const range = half => (css.match(new RegExp('tajawal-' + half + '-400-normal\\.woff2[^}]*unicode-range:([^;}]+)')) || [])[1];
const AR = range('arabic'), LA = range('latin');
if (!AR || !LA) { console.error('guide.css has no Tajawal unicode-ranges'); process.exit(1); }
const FONTS = [
  font('BarlowC', 700, 'italic', 'barlow-condensed/files/barlow-condensed-latin-700-italic.woff2'),
  font('DMSans', 500, 'normal', 'dm-sans/files/dm-sans-latin-500-normal.woff2'),
  font('DMSans', 700, 'normal', 'dm-sans/files/dm-sans-latin-700-normal.woff2'),
  font('Cairo', 700, 'normal', 'cairo/files/cairo-arabic-700-normal.woff2', AR),
  font('Cairo', 700, 'normal', 'cairo/files/cairo-latin-700-normal.woff2', LA),
  font('Tajawal', 500, 'normal', 'tajawal/files/tajawal-arabic-500-normal.woff2', AR),
  font('Tajawal', 500, 'normal', 'tajawal/files/tajawal-latin-500-normal.woff2', LA),
].join('\n');

const MARK = 'data:image/png;base64,' + b64(path.join(G, 'assets/isom-logo.png'));
const data = JSON.parse(fs.readFileSync(path.join(G, 'data/courses.json'), 'utf8'));
const cover = path.join(G, 'dist/cover-b.html');
const net = fs.existsSync(cover) && fs.readFileSync(cover, 'utf8').match(/<svg class="cB__net"[\s\S]*?<\/svg>/);
if (!net) { console.error('run `cd guide && node covers.js` first — the preview uses the cover\'s drawing'); process.exit(1); }

const page = (w, h, body, extra) => `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#fff}
${extra}</style></head><body>${body}</body></html>`;

/* the link preview: the question in both languages at one size, the line
   that says what the site does, and the address — over the cover's drawing */
const OG = page(1200, 630, `
<div class="og">
  <svg class="net" viewBox="480 60 1160 1070" preserveAspectRatio="xMidYMid slice">${net[0].replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
  <div class="t">
    <img class="mk" src="${MARK}" alt="">
    <div class="en">When do I graduate?</div>
    <div class="ar" lang="ar" dir="rtl">متى أتخرج؟</div>
    <div class="ln">Tick the courses you have passed on your own course map, and see the term you graduate.</div>
    <div class="ln lar" lang="ar" dir="rtl">أشّر على المقررات التي اجتزتها على خريطة مقرراتك، واعرف الفصل الذي تتخرج فيه.</div>
    <div class="url">${data.site.short}</div>
  </div>
</div>`, `
.og{position:relative;width:1200px;height:630px;background:#F5F5F5;overflow:hidden}
.net{position:absolute;right:0;top:0;width:640px;height:630px;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 30%);mask-image:linear-gradient(90deg,transparent,#000 30%)}
.net path{fill:none;stroke:#660000;stroke-width:2.6;stroke-opacity:.42}
.t{position:absolute;left:64px;top:52px;width:640px}
.mk{height:118px;width:auto;display:block;margin-bottom:26px}
.en{font-family:BarlowC;font-weight:700;font-style:italic;font-size:78px;line-height:1;color:#660000}
.ar{font-family:Cairo;font-weight:700;font-size:78px;line-height:1.5;color:#660000;text-align:right}
.ln{margin-top:14px;font-family:DMSans;font-weight:500;font-size:25px;line-height:1.35;color:#2E2726}
.lar{margin-top:6px;font-family:Tajawal;font-size:25px;line-height:1.55;text-align:right}
.url{margin-top:22px;font-family:DMSans;font-weight:700;font-size:24px;color:#660000}`);

/* the icons: the club mark on white, nothing added to it */
const ICON = s => page(s, s, `<div class="i"><img src="${MARK}" alt=""></div>`, `
.i{width:${s}px;height:${s}px;display:grid;place-items:center;background:#fff}
.i img{width:${Math.round(s * (s > 64 ? 0.84 : 0.97))}px;height:auto;display:block}`);

(async () => {
  const br = await chromium.launch(LAUNCH);
  const shoot = async (html, w, h, file) => {
    const p = await br.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(html, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: 0, width: w, height: h } });
    await p.close();
    console.log('public/' + file, w + 'x' + h);
  };
  fs.mkdirSync(OUT, { recursive: true });
  await shoot(OG, 1200, 630, 'og.png');
  await shoot(ICON(180), 180, 180, 'apple-touch-icon.png');
  await shoot(ICON(32), 32, 32, 'favicon-32.png');
  await br.close();
})();
