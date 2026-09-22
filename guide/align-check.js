/* Every page centres its title block on the COURSE COLUMNS, not on the sheet.
   node align-check.js [page ...]                                            */
const { chromium } = require('playwright');
const fs = require('fs');
/* Playwright's Chromium: a pinned build in the cloud sandbox, whatever
   `npx playwright install chromium` put down on a normal machine. */
const PINNED = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const LAUNCH = { args: ['--no-sandbox', '--font-render-hinting=none'] };
if (fs.existsSync(PINNED)) LAUNCH.executablePath = PINNED;
const path = require('path');
const pages = process.argv.slice(2);
if (!pages.length) pages.push('mis', 'oscm', 'general');

(async () => {
  const b = await chromium.launch(LAUNCH);
  let worst = 0;
  for (const name of pages) {
    const p = await b.newPage({ viewport: { width: 2245, height: 1587 } });
    await p.goto('file://' + path.join(__dirname, 'dist', name + '.html'), { waitUntil: 'networkidle' });
    const r = await p.evaluate(() => {
      const mid = s => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return +(q.left + q.width / 2).toFixed(2); };
      const cards = [...document.querySelectorAll('#grid .crd')].map(e => e.getBoundingClientRect());
      const L = Math.min(...cards.map(c => c.left)), R = Math.max(...cards.map(c => c.right));
      const out = { courseColumns: +((L + R) / 2).toFixed(2), titleEN: mid('.hd__en'), titleAR: mid('.hd__ar'), titleMeta: mid('.hd__meta') };
      /* a stream page ends each colour column separately, so its final course
         belongs over its own column, not on the sheet's centre line */
      const cap = document.querySelector('.page[data-streams]') ? null : document.querySelector('.crd--capstone');
      if (cap) { const q = cap.getBoundingClientRect(); out.capstone = +(q.left + q.width / 2).toFixed(2); }
      return out;
    });
    const vals = Object.values(r).filter(v => v !== null);
    const spread = Math.max(...vals) - Math.min(...vals);
    worst = Math.max(worst, spread);
    console.log(name.padEnd(8), JSON.stringify(r), '→ spread', spread.toFixed(2) + 'px');
    await p.close();
  }
  await b.close();
  console.log(worst < 0.5 ? '\nall pages share one centre line' : '\nWORST SPREAD ' + worst.toFixed(2) + 'px — fix before shipping');
  process.exit(worst < 0.5 ? 0 : 1);
})();
