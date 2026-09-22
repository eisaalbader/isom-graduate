const { chromium } = require('playwright');
const fs = require('fs');
/* Playwright's Chromium: a pinned build in the cloud sandbox, whatever
   `npx playwright install chromium` put down on a normal machine. */
const PINNED = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const LAUNCH = { args: ['--no-sandbox', '--font-render-hinting=none'] };
if (fs.existsSync(PINNED)) LAUNCH.executablePath = PINNED;
const path = require('path');
const ok=(c,m)=>console.log((c?'PASS  ':'FAIL  ')+m);
(async () => {
  const b = await chromium.launch(LAUNCH);
  const p = await b.newPage({ viewport:{width:1600,height:1000} });
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://'+path.join(__dirname,'..','public','index.html'), {waitUntil:'networkidle'});
  await p.waitForTimeout(800);
  for (const mj of ['mis','oscm']) {
    const r = await p.evaluate((mj)=>{
      S.major=mj; S.done=new Set(); S.step=2; paint(); tickAllLegal(); syncTicks();
      const M=P.majors[mj];
      const both = M.paths.length===2 &&
        [M.paths[0].top].concat(M.paths[0].codes).some(c=>S.done.has(c)) &&
        [M.paths[1].top].concat(M.paths[1].codes).some(c=>S.done.has(c));
      const over = GS.map((g,i)=>g.codes.filter(c=>S.done.has(c)).length>g.max ? i : -1).filter(i=>i>=0);
      const lockedAfter = [...document.querySelectorAll('.stage .crd.is-lock.is-done')].length;
      S.step=3; paint(); tickAllLegal(); syncTicks();
      const overEl = GS.map((g,i)=>g.codes.filter(c=>S.done.has(c)).length>g.max ? i : -1).filter(i=>i>=0);
      S.step=1; paint(); tickAllLegal(); syncTicks();
      S.freeDone=2;
      const o=outstanding();
      return {both, over, overEl, lockedAfter, left:o.need.length+o.open.length};
    }, mj);
    ok(!r.both, mj+': Tick all never fills both paths');
    ok(r.over.length===0 && r.overEl.length===0, mj+': Tick all never exceeds a group\'s pick');
    ok(r.lockedAfter===0, mj+': nothing ends up both ticked and locked');
    ok(r.left===0, mj+': ticking all three sheets legally leaves 0 of 45 (got '+r.left+')');
  }
  console.log('page errors:', errs);
  await b.close();
})();
