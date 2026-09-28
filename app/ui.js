#!/usr/bin/env node
/* The planner's own screens, checked the way verify.js checks a sheet.
   Walks all six screens like a student would, on a phone and on a computer,
   and fails on any of:
     a page error
     a glyph drawn in a font the page did not load
     a button smaller than a thumb (44 x 44 px)
     text under 4.5:1 contrast, or under 12 px
     Arabic text not marked as Arabic (lang="ar")
     an Arabic line set flush left
     a spaced year pair inside Arabic ("2026 / 2027" reverses), or a full
       stop straight after a figure in Arabic ("25." shows as ".25")
     a page wider than the screen
   The printed sheet inside a map screen is verify.js's job; here it is checked
   only for fonts and for its Arabic being marked as Arabic.

   node app/ui.js            exits 1 on any failure */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const PINNED = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const LAUNCH = { args: ['--no-sandbox', '--font-render-hinting=none'] };
if (fs.existsSync(PINNED)) LAUNCH.executablePath = PINNED;
/* PLANNER_HTML=some/other.html checks another build, e.g. to prove a check can fail */
const URL = 'file://' + (process.env.PLANNER_HTML ? path.resolve(process.env.PLANNER_HTML) : path.join(__dirname, '..', 'public', 'index.html'));

const SIZES = {
  phone:    { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true },  /* an iPhone with Safari's bars */
  computer: { viewport: { width: 1440, height: 900 } },
};

/* ---- in the page: everything but the fonts ---- */
function audit() {
  const out = [];
  const AR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
  const vis = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const name = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '');
  const inStage = e => !!e.closest('.stage');
  const said = e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);

  /* page wider than the screen */
  const sw = document.documentElement.scrollWidth;
  if (sw > innerWidth + 1) out.push('page is ' + sw + ' px wide on a ' + innerWidth + ' px screen');

  /* buttons a thumb can hit */
  document.querySelectorAll('button,a[href],[role=button],input,select').forEach(b => {
    if (inStage(b) || !vis(b)) return;
    const r = b.getBoundingClientRect();
    if (r.width < 44 - .5 || r.height < 44 - .5) out.push('small button ' + Math.round(r.width) + 'x' + Math.round(r.height) + ': ' + name(b) + ' "' + said(b) + '"');
  });

  /* contrast and size, against what is really behind the text */
  const rgba = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (t, u) => { const a = t.a + u.a * (1 - t.a);
    return a ? { r: (t.r * t.a + u.r * u.a * (1 - t.a)) / a, g: (t.g * t.a + u.g * u.a * (1 - t.a)) / a, b: (t.b * t.a + u.b * u.a * (1 - t.a)) / a, a } : u; };
  const behind = e => { const st = [];
    for (let x = e; x; x = x.parentElement) { const c = rgba(getComputedStyle(x).backgroundColor); if (c && c.a > 0) { st.push(c); if (c.a >= 1) break; } }
    let res = { r: 255, g: 255, b: 255, a: 1 }; for (let i = st.length - 1; i >= 0; i--) res = over(st[i], res); return res; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const seen = new Set();
  document.querySelectorAll('body *').forEach(e => {
    if (inStage(e) || e.closest('svg,script,style') || !vis(e)) return;
    if (![...e.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())) return;
    if (e.closest('button:disabled')) return;               /* a disabled button is exempt */
    const s = getComputedStyle(e);
    const fg = rgba(s.color); if (!fg) { out.push('colour not readable: ' + name(e)); return; }
    let op = 1; for (let x = e; x; x = x.parentElement) op *= +getComputedStyle(x).opacity;
    const bg = behind(e), txt = over({ ...fg, a: fg.a * op }, bg);
    const r = ratio(txt, bg), px = parseFloat(s.fontSize);
    const k = name(e);
    if (r < 4.5 && !seen.has('c' + k)) { seen.add('c' + k); out.push('contrast ' + r.toFixed(2) + ':1 in ' + k + ' "' + said(e) + '"'); }
    if (px < 12 && !seen.has('s' + k)) { seen.add('s' + k); out.push(px + ' px text in ' + k + ' "' + said(e) + '"'); }
  });

  /* Arabic: marked as Arabic, never flush left, no spaced year pair */
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n, bad = 0, first = '';
  while ((n = w.nextNode())) {
    const el = n.parentElement;
    if (!el || !AR.test(n.nodeValue) || el.closest('script,style,svg')) continue;
    const l = el.closest('[lang]');
    if (!l || l.getAttribute('lang') !== 'ar') { bad++; if (!first) first = name(el) + ' "' + n.nodeValue.trim().slice(0, 30) + '"'; }
    if (/\d{4}\s+\/\s+\d{4}/.test(n.nodeValue)) out.push('spaced year pair in Arabic: "' + n.nodeValue.trim().slice(0, 40) + '"');
    /* a full stop straight after a figure lands on the figure's left in an
       Arabic line: "2.67." prints as ".2.67", "25." as ".25" */
    if (!el.closest('.stage') && /\d\.(?=\s|$)/.test(n.nodeValue)) out.push('full stop after a figure in Arabic: "' + n.nodeValue.trim().slice(0, 40) + '"');
  }
  if (bad) out.push(bad + ' Arabic text' + (bad > 1 ? 's' : '') + ' not marked lang="ar", first: ' + first);
  document.querySelectorAll('.arb').forEach(e => {
    if (inStage(e) || !vis(e) || e.closest('.st')) return;       /* the counter's word sits under its number */
    const s = getComputedStyle(e);
    if (s.display !== 'inline' && (s.textAlign === 'left' || (s.textAlign === 'start' && s.direction === 'ltr')))
      out.push('Arabic set flush left: ' + name(e) + ' "' + said(e) + '"');
  });
  return out;
}

/* ---- through the browser: which font drew each glyph ---- */
async function systemFonts(p) {
  await p.evaluate(() => document.fonts.ready);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: false });
  const nodes = [];
  (function walk(n) {
    if (n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE' || n.nodeName === 'HEAD') return;
    if (n.nodeType === 1 && (n.children || []).some(c => c.nodeType === 3 && c.nodeValue.trim())) nodes.push(n);
    (n.pseudoElements || []).forEach(pe => nodes.push(pe));
    (n.children || []).forEach(walk);
  })(root);
  const hits = {};
  for (const n of nodes) {
    let r; try { r = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: n.nodeId }); } catch (e) { continue; }
    r.fonts.filter(f => !f.isCustomFont).forEach(f => {
      const a = n.attributes || [], i = a.indexOf('class');
      const k = f.familyName + ' in ' + (i >= 0 ? '.' + a[i + 1].split(' ')[0] : n.nodeName.toLowerCase());
      hits[k] = (hits[k] || 0) + f.glyphCount;
    });
  }
  await cdp.detach();
  return Object.entries(hits).map(([k, v]) => v + ' glyph' + (v > 1 ? 's' : '') + ' drawn in ' + k + ', a font the page does not load');
}

(async () => {
  const b = await chromium.launch(LAUNCH);
  let fails = 0, checks = 0;
  for (const [size, opts] of Object.entries(SIZES)) {
    const ctx = await b.newContext(opts);
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    const settle = () => p.waitForTimeout(450);
    const check = async label => {
      await settle();
      const problems = (await p.evaluate(audit)).concat(await systemFonts(p)).concat(errs.splice(0).map(e => 'page error: ' + e));
      checks++;
      if (problems.length) { fails++; console.log('FAIL  ' + size + ' — ' + label); problems.forEach(x => console.log('        ' + x)); }
      else console.log('PASS  ' + size + ' — ' + label);
    };
    await p.goto(URL, { waitUntil: 'networkidle' });
    await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await p.reload({ waitUntil: 'networkidle' });
    await check('first screen');
    await p.click('[data-m="mis"]');                         await check('first screen, MIS picked');
    await p.click('#next');                                  await check('general courses map, first visit');
    const c = await p.$$eval('.stage .crd[data-code]', e => e.slice(0, 3).map(x => x.dataset.code));
    for (const code of c) await p.click('.stage .crd[data-code="' + code + '"]', { force: true });
    await check('general courses map, three ticked');
    await p.click('[data-band="rail"]'); await p.waitForTimeout(700);
    await check('general courses map, on "What you must do"');
    await p.click('#next');                                  await check('MIS map');
    await p.click('#next');                                  await check('electives map');
    await p.click('[data-fr="1"]');                          await check('electives map, one free elective');
    await p.click('#next');                                  await check('pace');
    await p.click('[data-s="0"]');                           await check('pace, no summers');
    await p.click('#next');                                  await check('your plan');
    await p.evaluate(() => { const x = document.querySelector('.pan'); x.scrollTop = x.scrollHeight; });
    await check('your plan, scrolled to the end');
    await p.reload({ waitUntil: 'networkidle' });            await check('coming back: welcome back');
    await p.evaluate(() => { S.step = 1; paint(); tickAllLegal(); S.step = 2; paint(); tickAllLegal();
      S.step = 3; paint(); tickAllLegal(); S.freeDone = 2; render(5); });
    await p.waitForTimeout(400);                             await check('your plan, everything passed');
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' of ' + checks + ' screens FAIL' : 'ALL ' + checks + ' SCREENS PASS');
  process.exit(fails ? 1 : 0);
})();
