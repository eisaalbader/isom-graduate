#!/usr/bin/env node
/* Two cover sheets. node covers.js && node render.js cover-a  */
const fs = require('fs'), path = require('path');
const ROOT = __dirname, DIST = path.join(ROOT, 'dist');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/courses.json'), 'utf8'));
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const HEAD = title => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<link rel="stylesheet" href="../src/guide.css"><link rel="stylesheet" href="../src/cover.css"></head><body>`;


/* the original cover has ghosted gear outlines; we have no gear asset, so draw them */
function gear(cx, cy, r, teeth) {
  const step = Math.PI * 2 / teeth, r2 = r * 0.80;
  const pt = (a, rr) => `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step, a1 = a0 + step * 0.46, a2 = a0 + step;
    d += (i ? 'L' : 'M') + pt(a0, r2) + 'L' + pt(a0, r) + 'L' + pt(a1, r) + 'L' + pt(a1, r2) + 'L' + pt(a2, r2);
  }
  return `<path d="${d}Z"/><circle cx="${cx}" cy="${cy}" r="${(r * 0.36).toFixed(1)}"/>`;
}

/* ---------------- version A — the club's own cover ---------------- */
function coverA() {
  const bars = [
    [26, 156, 58, 10], [104, 150, 226, 4], [498, 306, 62, 10], [50, 316, 236, 4],
  ];
  return `
<section class="cover cA">
  <svg class="cA__gears" viewBox="0 0 594 420">
    ${gear(66, 150, 44, 14)}${gear(126, 206, 26, 12)}${gear(58, 232, 17, 10)}
  </svg>
  <div class="cA__ghost">Club</div>

  <img class="cA__crest" src="../assets/ku-logo.png" alt="Kuwait University">
  <div class="cA__cba">College of Business Administration<span>كلية العلوم الإدارية</span></div>
  <div class="cA__mark">ISOM<br>STUDENTS</div>

  <div class="cA__club">
    <img src="../assets/isom-logo.png" alt="ISOM Club">
    <div class="cA__clubname">Information Systems and<br>Operations Management Club</div>
  </div>

  ${bars.map(([l, t, w, h]) => `<div class="cA__bar" style="left:${l}mm;top:${t}mm;width:${w}mm;height:${h}mm"></div>`).join('')}
  <div class="cA__year">2026 / 2027</div>
  <div class="cA__panel"></div>
  <div class="cA__title">
    <div class="cA__ar">دليل الطالب</div>
    <div class="cA__en">STUDENT GUIDE</div>
  </div>

  <img class="cA__qr" src="../assets/qr.png" alt="">
  <div class="cA__motto">DO NOT STOP UNTIL YOU ARE PROUD</div>
</section>`;
}

/* ---------------- version B — the whole degree, drawn ----------------
   Every node is a real course and every line a real prerequisite, taken
   straight from courses.json. Nothing here is decoration.            */
function constellation(W, H) {
  const all = {};
  const add = (c, page) => { if (!all[c.code]) all[c.code] = { code: c.code, cat: c.cat, pre: c.pre || [], page }; };
  data.general.courses.forEach(c => add(c, 'g'));
  data.mis.courses.forEach(c => add(c, 'm'));
  data.oscm.core.forEach(c => add(c, 'o'));

  /* depth = one step past the deepest course it needs */
  const depth = {}, seen = {};
  const walk = code => {
    if (depth[code] !== undefined) return depth[code];
    if (seen[code]) return 0;
    seen[code] = 1;
    const p = (all[code].pre || []).filter(x => all[x]);
    depth[code] = p.length ? 1 + Math.max(...p.map(walk)) : 0;
    return depth[code];
  };
  Object.keys(all).forEach(walk);

  const maxD = Math.max(...Object.values(depth));
  const cols = {};
  Object.keys(all).forEach(c => (cols[depth[c]] = cols[depth[c]] || []).push(c));
  /* inside a column, keep the two majors apart so the split is visible */
  const rank = { g: 1, m: 0, o: 2 };
  Object.keys(cols).forEach(d => cols[d].sort((a, b) => rank[all[a].page] - rank[all[b].page] || a.localeCompare(b)));

  const pos = {};
  Object.keys(cols).forEach(d => {
    const list = cols[d], n = list.length;
    list.forEach((c, i) => {
      pos[c] = {
        x: 0.30 * W + (+d / maxD) * 0.66 * W,
        y: H * (0.5 + (n === 1 ? 0 : (i / (n - 1) - 0.5)) * Math.min(0.94, 0.22 + n * 0.085)),
      };
    });
  });

  const tint = { core: '#660000', lang: '#1F4E79', math: '#0E6E63', acct: '#8A5E14',
                 econ: '#9C4614', biz: '#5B3A72', elective: '#A9741A', support: '#55632B',
                 analytics: '#0E6E63', appdev: '#1F4E79', technical: '#55632B' };
  const lines = [], dots = [];
  Object.keys(all).forEach(c => (all[c].pre || []).forEach(p => {
    if (!pos[p] || !pos[c]) return;
    const a = pos[p], b = pos[c], mx = (a.x + b.x) / 2;
    lines.push(`<path d="M${a.x.toFixed(1)},${a.y.toFixed(1)} C${mx.toFixed(1)},${a.y.toFixed(1)} ${mx.toFixed(1)},${b.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}"/>`);
  }));
  Object.keys(all).forEach(c => {
    const p = pos[c], big = all[c].page !== 'g';
    dots.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${big ? 5.6 : 4.2}" fill="${tint[all[c].cat] || '#660000'}" opacity="${big ? .9 : .66}"/>`);
  });
  return { svg: `<svg class="cB__net" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${lines.join('')}${dots.join('')}</svg>`,
           count: Object.keys(all).length };
}

function coverB() {
  const net = constellation(1680, 1190);
  return `
<section class="cover cB">
  <div class="cB__wash"></div>
  <img class="cB__wm" src="../assets/isom-maroon.png" alt="">
  ${net.svg}
  <div class="cB__veil"></div>

  <div class="cB__head">
    <div>
      <img class="cB__logo" src="../assets/isom-logo.png" alt="ISOM Club">
      <div class="cB__who">ISOM CLUB &nbsp;·&nbsp; KUWAIT UNIVERSITY<b>نادي نظم المعلومات وإدارة العمليات &nbsp;·&nbsp; جامعة الكويت</b></div>
    </div>
    <img class="cB__crest" src="../assets/ku-logo.png" alt="Kuwait University">
  </div>

  <div class="cB__body">
    <div class="cB__ar">دليل الطالب</div>
    <div class="cB__rule"></div>
    <div class="cB__en">STUDENT GUIDE</div>
    <div class="cB__sub">Your whole degree on one page — every course, every number, and the exact order you take them in.
      <b>درجتك كاملة في صفحة واحدة: كل مقرر، وكل رقم، والترتيب الذي تدرسها به.</b></div>
  </div>

  <div class="cB__year">2026 / 2027<span>ISOM STUDENTS</span></div>
</section>`;
}

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'cover-a.html'), HEAD('ISOM Student Guide — Cover A') + coverA() + '</body></html>');
fs.writeFileSync(path.join(DIST, 'cover-b.html'), HEAD('ISOM Student Guide — Cover B') + coverB() + '</body></html>');
console.log('wrote dist/cover-a.html + dist/cover-b.html');
