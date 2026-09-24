#!/usr/bin/env node
/* The sheets as students open them on a phone or iPad.

   Same pages, same vector text and lines as the print PDFs, rendered the same
   way render.js renders them (same window, same pixel density), so every word
   and every line lands where verify.js checked it. What is left out is what
   makes a phone slow to draw a page:
   - blurred card shadows, which Chromium writes out as dozens of small
     pictures per sheet. The capstone keeps its maroon ring, which is a line;
   - multiply blending on the level stripes and watermarks, which on the
     sheet's pale ground looks the same as plain transparency;
   - on the cover, the three slowest things in the booklet to draw:
     . the colour wash, two soft gradients with transparency. It is
       photographed once and laid back as a picture at half size (it has no
       edges to lose), which phone.py stores as a full-colour JPEG;
     . the veil that fades the course map out on the left. It is the page
       colour, solid for the first 46% and then fading out left to right.
       The solid part becomes a plain rectangle; the fade is measured off the
       page, column by column, and laid back as a picture of just that;
     . each dot of the course map was its own transparency group because of
       `opacity`; the same see-through fill without the group, `fill-opacity`,
       looks identical, since a dot has no outline to overlap its fill.
   Nothing that carries information changes.

     cd guide && node screen.js && python3 phone.py
*/
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const PINNED = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const LAUNCH = { args: ['--no-sandbox', '--font-render-hinting=none'] };
if (fs.existsSync(PINNED)) LAUNCH.executablePath = PINNED;

const PAGES = ['cover-b', 'mis', 'oscm', 'general', 'electives', 'transfer', 'numbers'];
const OUT = path.join(__dirname, 'dist', 'screen');
const SCREEN_CSS = `
  .crd, .tcol { box-shadow: none !important; }
  .crd--capstone { box-shadow: 0 0 0 .7mm rgba(102,0,0,.3) !important; }
  .wm img, .stripe, .cB__wm { mix-blend-mode: normal !important; }`;

/* A PNG, written by hand so nothing premultiplies the colours: RGBA, 8 bits. */
function png(w, h, rgba) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;
  });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const td = Buffer.concat([Buffer.from(type), data]), out = Buffer.alloc(td.length + 8);
    out.writeUInt32BE(data.length, 0); td.copy(out, 4); out.writeUInt32BE(crc(td), td.length + 4); return out;
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const rows = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(rows, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
                        chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* Photograph one layer of the cover on its own: one pixel per CSS pixel,
   clipped to whole pixels inside the layer so nothing from beyond the page's
   edge gets in. */
async function photograph(p, sel, transparent) {
  const box = await p.evaluate(([sel, transparent]) => {
    const keep = document.querySelector(sel), cover = document.querySelector('.cover');
    const saved = [];
    cover.querySelectorAll(':scope > *').forEach(e => {
      if (e !== keep) { saved.push([e, 'visibility', e.style.visibility]); e.style.visibility = 'hidden'; }
    });
    if (transparent) [cover, document.body, document.documentElement].forEach(e => {
      saved.push([e, 'background', e.style.background]); e.style.background = 'transparent';
    });
    window.__restore = () => saved.forEach(([e, k, v]) => { e.style[k] = v; });
    const r = keep.getBoundingClientRect();
    return { x: r.x, y: r.y, width: Math.floor(r.width), height: Math.floor(r.height) };
  }, [sel, transparent]);
  const shot = await p.screenshot({ type: 'png', scale: 'css', clip: box, omitBackground: transparent });
  await p.evaluate(() => window.__restore());
  return `data:image/png;base64,${shot.toString('base64')}`;
}

async function cover(p) {
  /* the wash, at half size */
  const wash = await p.evaluate(async src => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = Math.round(img.width / 2); c.height = Math.round(img.height / 2);
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }, await photograph(p, '.cB__wash', false));
  await p.evaluate(url => { document.querySelector('.cB__wash').style.background = `url(${url}) 0 0 / 100% 100% no-repeat`; }, wash);

  /* the veil: its colour, and each column's transparency averaged down the page */
  const { rgb, alpha, width, h } = await p.evaluate(async src => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, c.width, c.height).data, sum = new Array(c.width).fill(0);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) sum[x] += px[(y * c.width + x) * 4 + 3];
    return { rgb: [px[0], px[1], px[2]], alpha: sum.map(s => Math.round(s / c.height)), h: c.height,
             width: document.querySelector('.cB__veil').getBoundingClientRect().width };
  }, await photograph(p, '.cB__veil', true));
  let solid = 0;
  while (solid < alpha.length && alpha[solid] === 255) solid++;
  if (solid < 100 || solid === alpha.length) throw new Error('the veil is not solid-then-fading any more: ' + solid + ' solid columns');
  /* The fade, one row per pixel of the page's height, every row the same.
     A single stretched row would do in most viewers, but not in one that
     fades a stretched picture's edges. */
  const n = alpha.length - solid, row = Buffer.alloc(n * 4), fade = Buffer.alloc(n * 4 * h);
  for (let i = 0; i < n; i++) row.set([...rgb, alpha[solid + i]], i * 4);
  for (let y = 0; y < h; y++) row.copy(fade, y * n * 4);
  const url = `data:image/png;base64,${png(n, h, fade).toString('base64')}`;
  await p.evaluate(([url, solid, width, rgb]) => {
    const veil = document.querySelector('.cB__veil'), block = document.createElement('div');
    /* the solid part runs 4px under the fade, so no seam can open between them at any zoom */
    block.style.cssText = `position:absolute;left:0;top:0;bottom:0;width:${solid + 4}px;background:rgb(${rgb.join(',')})`;
    veil.parentNode.insertBefore(block, veil);
    veil.style.left = solid + 'px';
    veil.style.width = (width - solid) + 'px';
    veil.style.background = `url(${url}) 0 0 / 100% 100% no-repeat`;
  }, [url, solid, width, rgb]);

  /* the dots: the same see-through fill, without a transparency group each */
  await p.evaluate(() => document.querySelectorAll('.cB__net circle').forEach(c => {
    const o = c.getAttribute('opacity');
    if (o !== null) { c.style.fillOpacity = o; c.style.opacity = '1'; }
  }));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(LAUNCH);
  for (const name of PAGES) {
    const p = await b.newPage({ viewport: { width: 2245, height: 1587 }, deviceScaleFactor: 2 });   /* as render.js */
    await p.goto('file://' + path.join(__dirname, 'dist', name + '.html'), { waitUntil: 'networkidle' });
    if (await p.$('#wires')) {
      await p.waitForFunction(() => document.documentElement.getAttribute('data-wires') === 'done', { timeout: 15000 });
    }
    await p.addStyleTag({ content: SCREEN_CSS });
    if (name === 'cover-b') await cover(p);
    await p.waitForTimeout(400);
    await p.pdf({ path: path.join(OUT, name + '.pdf'), width: '594mm', height: '420mm', printBackground: true,
                  margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await p.close();
    console.log('screen  dist/screen/' + name + '.pdf');
  }
  await b.close();
})();
