#!/usr/bin/env node
/* Automated checks for every rendered page.
   node verify.js mis oscm                                            */
const { chromium } = require('playwright');
const fs = require('fs');
/* Playwright's Chromium: a pinned build in the cloud sandbox, whatever
   `npx playwright install chromium` put down on a normal machine. */
const PINNED = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const LAUNCH = { args: ['--no-sandbox', '--font-render-hinting=none'] };
if (fs.existsSync(PINNED)) LAUNCH.executablePath = PINNED;
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/courses.json'), 'utf8'));

const pages = process.argv.slice(2);
if (!pages.length) pages.push('mis', 'oscm', 'general', 'electives', 'transfer', 'numbers');

const expected = {
  mis: [...data.mis.courses, ...data.mis.electives, ...data.mis.support, ...data.mis.gateway.courses],
  oscm: [...data.oscm.core, ...data.oscm.electives, ...data.oscm.technical, ...data.oscm.gateway.courses],
  general: [...data.general.courses],
  electives: data.electives.groups.reduce((a, g) => a.concat(g.courses), []),
  /* the transfer page draws three real course cards, pulled from the same data */
  transfer: data.transfer.outside.pick.map(p => {
    let hit = null;
    (function walk(o) {
      if (hit) return;
      if (Array.isArray(o)) return o.forEach(walk);
      if (o && typeof o === 'object') {
        if (o.code === p.code && o.en && o.ar) { hit = o; return; }
        Object.keys(o).forEach(k => walk(o[k]));
      }
    })(data);
    return hit;
  }),
  numbers: [],
};
/* what the card is supposed to print in its credits slot, per course */
const creditOf = {};
Object.keys(expected).forEach(k => expected[k].forEach(c => {
  creditOf[k + ':' + c.code] = (c.cr === false) ? '(none)' : ((c.cr == null) ? '\u2014' : c.cr + ' CR');
}));

(async () => {
  const b = await chromium.launch(LAUNCH);
  let fails = 0;
  for (const name of pages) {
    const p = await b.newPage({ viewport: { width: 2245, height: 1587 } });
    await p.goto('file://' + path.join(__dirname, 'dist', name + '.html'), { waitUntil: 'networkidle' });
    await p.waitForFunction(() => document.documentElement.getAttribute('data-wires') === 'done', { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(250);

    const r = await p.evaluate(() => {
      const out = { codes: [], creds: [], overflow: [], collisions: [], lowContrast: [], clipped: [], overlaps: [], arrows: [], crossings: [] };

      document.querySelectorAll('.crd[data-code]').forEach(c => {
        out.codes.push(c.dataset.code);
        const cr = c.querySelector('.crd__cr');
        out.creds.push(c.dataset.code + '=' + (cr ? cr.textContent.trim() : '(none)'));
      });

      // nothing may spill outside the sheet
      const page = (document.querySelector('.page') || document.querySelector('.cover')).getBoundingClientRect();
      document.querySelectorAll('.crd,.panel,.band,.ft,.hd,.ladder-note,.nextstep,.gatebox,.startbox,.stag,.levelnote,.gatelead,.cA__title,.cA__club,.cB__body,.cB__stats,.tcol,.tier,.tend,.anat,.nbox,.ex,.trow,.nrow,.apart').forEach(e => {
        const q = e.getBoundingClientRect();
        if (q.right > page.right + 1 || q.bottom > page.bottom + 1 || q.left < page.left - 1 || q.top < page.top - 1)
          out.overflow.push((e.dataset.code || e.className.split(' ')[0]) + ' ' +
            JSON.stringify({ l: +(q.left - page.left).toFixed(1), t: +(q.top - page.top).toFixed(1), r: +(q.right - page.right).toFixed(1), b: +(q.bottom - page.bottom).toFixed(1) }));
      });

      // text must never be clipped by its own box
      document.querySelectorAll('.crd__en,.crd__ar,.key__en,.key__ar,.steps li,.ztag__en,.elist__en,.trow__en,.trow__ar,.maj__en,.maj__ar,.nrow__en,.nrow__ar,.apart__v,.apart__va,.apart__d,.ex__en,.ex__ar,.tcol__en,.tcol__ar,.tchip,.tier__g,.nrow__d,.mine__en,.mine__ar,.tend__en,.tend__ar,.nbox__h,.nbox__ha').forEach(e => {
        if (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2)
          out.clipped.push((e.textContent || '').trim().slice(0, 46));
      });

      // no wire may cross a text-bearing element
      const svg = document.getElementById('wires');
      if (svg) {
        const texty = [...document.querySelectorAll('.crd__top,.crd__body,.ztag,.orbox,.band,.panel')]
          .map(e => { const q = e.getBoundingClientRect(); return { n: e.className.split(' ')[0], x: q.left, y: q.top, w: q.width, h: q.height }; });
        svg.querySelectorAll(':scope > path').forEach(pt => {
          const len = pt.getTotalLength();
          if (!len) return;
          for (let i = 0; i <= len; i += 3) {
            const s = pt.getPointAtLength(i);
            const g = svg.getBoundingClientRect();
            const X = g.left + s.x, Y = g.top + s.y;
            for (const t of texty) {
              if (X > t.x + 2 && X < t.x + t.w - 2 && Y > t.y + 2 && Y < t.y + t.h - 2) {
                out.collisions.push(t.n + ' @ ' + Math.round(s.x) + ',' + Math.round(s.y));
                return;
              }
            }
          }
        });
      }

      // NO TWO LINES MAY CROSS. Runs that leave the same course are allowed to
      // meet — that is a junction — but two unrelated runs never may.
      {
        const svg3 = document.getElementById('wires');
        if (svg3) {
          const segs = [], ends = {};
          svg3.querySelectorAll(':scope > path').forEach((pt, pi) => {
            const len = pt.getTotalLength(); if (!len) return;
            const bus = pt.getAttribute('data-bus') || ('?' + pi);
            const a = pt.getPointAtLength(0), b = pt.getPointAtLength(len);
            (ends[bus] = ends[bus] || []).push({ x: a.x, y: a.y }, { x: b.x, y: b.y });
            const step = 2; let prev = a;
            for (let i = step; i <= len + step; i += step) {
              const q = pt.getPointAtLength(Math.min(i, len));
              segs.push({ bus, x1: prev.x, y1: prev.y, x2: q.x, y2: q.y });
              prev = q;
            }
          });
          // a real junction: both runs have an end at the same spot, and the
          // touch happens right there. Anything else is a crossing.
          const junction = (ba, bb, px, py) =>
            (ends[ba] || []).some(p => (ends[bb] || []).some(q =>
              Math.hypot(p.x - q.x, p.y - q.y) < 3 && Math.hypot(px - p.x, py - p.y) < 6));
          const cross = (a, b) => {
            const d = (p1, p2, p3) => (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
            const A = { x: a.x1, y: a.y1 }, B = { x: a.x2, y: a.y2 }, C = { x: b.x1, y: b.y1 }, D = { x: b.x2, y: b.y2 };
            const d1 = d(C, D, A), d2 = d(C, D, B), d3 = d(A, B, C), d4 = d(A, B, D);
            return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
          };
          const seen2 = {};
          for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
            const a = segs[i], b = segs[j];
            if (a.bus === b.bus) continue;
            if (Math.max(a.x1, a.x2) < Math.min(b.x1, b.x2) - 1) continue;
            if (Math.max(b.x1, b.x2) < Math.min(a.x1, a.x2) - 1) continue;
            if (!cross(a, b)) continue;
            if (junction(a.bus, b.bus, a.x1, a.y1)) continue;
            const key = a.bus + ' X ' + b.bus;
            if (!seen2[key]) { seen2[key] = 1; out.crossings.push(key + ' @ ' + Math.round(a.x1) + ',' + Math.round(a.y1)); }
          }
        }
      }

      // every arrowhead must actually be painted
      {
        const svg2 = document.getElementById('wires');
        if (svg2) {
          const arrows = [...svg2.querySelectorAll(':scope > path')].filter(p => p.getAttribute('marker-end'));
          const head = svg2.querySelector('marker path');
          const fill = head ? getComputedStyle(head).fill : 'none';
          const dead = !head || fill === 'none' || /rgba\(0, 0, 0, 0\)/.test(fill) || fill === 'rgb(0, 0, 0)';
          if (arrows.length && dead)
            out.arrows.push(arrows.length + ' wires point at a course but the arrowhead is not painted (fill=' + fill + ')');
        }
      }

      // two text-bearing blocks may never sit on top of each other
      /* leaves only — a container that holds another listed block would always
         read as an overlap */
      const blocks = [...document.querySelectorAll('.crd,.panel,.band,.ft,.hd,.ladder-note,.nextstep,.gatebox,.startbox,.stag,.levelnote,.gatelead,.cA__title,.cA__club,.cB__body,.cB__stats,.tier,.tend,.ex,.trow,.nrow,.apart')]
        .map(e => ({ n: (e.dataset.code || e.className.split(' ')[0]), r: e.getBoundingClientRect() }))
        .filter(b => b.r.width > 1 && b.r.height > 1);
      for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i].r, b = blocks[j].r;
        const ov = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
                 * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (ov > 4) out.overlaps.push(blocks[i].n + ' over ' + blocks[j].n);
      }

      // contrast of card text against what is actually behind it
      const lum = c => { const v = c.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
      const parse = s => (s.match(/\d+/g) || [255, 255, 255]).slice(0, 3).map(Number);
      document.querySelectorAll('.crd__en,.crd__ar').forEach(e => {
        const fg = parse(getComputedStyle(e).color);
        let bg = [255, 255, 255], n = e.parentElement;
        while (n) { const c = getComputedStyle(n).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)/.test(c)) { bg = parse(c); break; } n = n.parentElement; }
        const L1 = lum(fg), L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
        if (ratio < 4.5) out.lowContrast.push((e.textContent || '').trim().slice(0, 30) + ' = ' + ratio.toFixed(2));
      });
      return out;
    });

    const isMap = !!expected[name];
    const exp = (expected[name] || []).map(c => c.code).sort();
    const got = r.codes.slice().sort();
    const tally = a => a.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});
    const te = tally(exp), tg = tally(got);
    const missing = Object.keys(te).filter(c => (tg[c] || 0) < te[c]);
    const extra = Object.keys(tg).filter(c => (te[c] || 0) < tg[c]);
    const dupes = [];
    const badCr = r.creds.filter(s => {
      const i = s.indexOf('='), code = s.slice(0, i), got = s.slice(i + 1);
      return creditOf[name + ':' + code] !== got;
    });

    const problems = [];
    if (isMap && missing.length) problems.push('missing from page: ' + missing.join(', '));
    if (isMap && extra.length) problems.push('not in data file: ' + extra.join(', '));
    if (isMap && dupes.length) problems.push('duplicated: ' + dupes.join(', '));
    if (isMap && badCr.length) problems.push('credits do not match the data file: ' + badCr.join(', '));
    if (r.overflow.length) problems.push('spills off the sheet: ' + r.overflow.join(' | '));
    if (r.clipped.length) problems.push('clipped text: ' + r.clipped.join(' | '));
    if (r.overlaps.length) problems.push('blocks overlap: ' + [...new Set(r.overlaps)].join(' | '));
    if (r.arrows.length) problems.push(r.arrows.join(' | '));
    if (r.crossings.length) problems.push('lines cross each other: ' + r.crossings.join(' | '));
    if (r.collisions.length) problems.push('wire crosses text: ' + [...new Set(r.collisions)].join(' | '));
    if (r.lowContrast.length) problems.push('contrast under 4.5:1 — ' + r.lowContrast.join(' | '));

    console.log('\n=== ' + name + ' === ' + r.codes.length + ' courses rendered');
    if (!problems.length) console.log('  PASS — all checks clean');
    else { fails += problems.length; problems.forEach(x => console.log('  FAIL ' + x)); }
    await p.close();
  }
  await b.close();
  console.log('\n' + (fails ? fails + ' problem(s)' : 'all pages pass'));
  process.exit(fails ? 1 : 0);
})();
