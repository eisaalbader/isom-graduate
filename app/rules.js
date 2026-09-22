const { chromium } = require('playwright');
const fs = require('fs');
/* Playwright's Chromium: a pinned build in the cloud sandbox, whatever
   `npx playwright install chromium` put down on a normal machine. */
const PINNED = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const LAUNCH = { args: ['--no-sandbox', '--font-render-hinting=none'] };
if (fs.existsSync(PINNED)) LAUNCH.executablePath = PINNED;
const path = require('path');
const ok = (c,m)=>console.log((c?'PASS  ':'FAIL  ')+m);
(async () => {
  const b = await chromium.launch(LAUNCH);
  const p = await b.newPage({ viewport:{width:1600,height:1000} });
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://'+path.join(__dirname,'..','public','index.html'), {waitUntil:'networkidle'});
  await p.waitForTimeout(800);

  // ---- MIS path exclusivity ----
  let r = await p.evaluate(()=>{
    S.major='mis'; S.done=new Set(); S.step=2; paint();
    const lock = ()=>[...document.querySelectorAll('.stage .crd.is-lock')].map(e=>e.dataset.code);
    const before = lock();
    S.done.add('1013340'); syncTicks();                 // chose the analytics path
    const after = lock();
    S.done.add('1013440'); S.done.add('1013441'); syncTicks();   // its 2 of 3
    const full = lock();
    S.done.delete('1013340'); S.done.delete('1013440'); S.done.delete('1013441'); syncTicks();
    return {before, after, full, reset: lock()};
  });
  ok(r.before.length===0, 'nothing locked on a blank MIS map');
  ok(['1013350','1013452','1013453','1013454'].every(c=>r.after.includes(c)),
     'picking the analytics top closes the whole app-development path');
  ok(r.full.includes('1013442'), 'the third analytics course locks once 2 of 3 are picked');
  ok(!r.full.includes('1013440'), 'a course you picked never locks');
  ok(r.reset.length===0, 'unticking opens everything again');

  // ---- MIS pick-1 elective + take-both support ----
  r = await p.evaluate(()=>{
    S.done=new Set(['1013351']); syncTicks();
    const l=[...document.querySelectorAll('.stage .crd.is-lock')].map(e=>e.dataset.code);
    return {l, sup:['1013316','1011430'].filter(c=>l.includes(c))};
  });
  ok(['1013451','1013480','1013492'].every(c=>r.l.includes(c)), 'the other 3 major electives lock after one pick');
  ok(r.sup.length===0, 'the two supporting courses never lock — you take both');

  // ---- OSCM pick 3 of 8, pick 2 of 5 ----
  r = await p.evaluate(()=>{
    S.major='oscm'; S.done=new Set(); S.step=2; paint();
    S.done.add('1013450'); S.done.add('1013420'); syncTicks();
    const two=[...document.querySelectorAll('.stage .crd.is-lock')].map(e=>e.dataset.code);
    S.done.add('1013485'); syncTicks();
    const three=[...document.querySelectorAll('.stage .crd.is-lock')].map(e=>e.dataset.code);
    return {two, three};
  });
  ok(r.two.length===0, 'OSCM: nothing locks at 2 of the 3 major electives');
  ok(['1013493','1013412','1013425','1013470','1013481'].every(c=>r.three.includes(c)),
     'OSCM: the remaining 5 lock once 3 are picked');

  // ---- electives: pick 1 per group, shared course counts once ----
  r = await p.evaluate(()=>{
    S.major='mis'; S.done=new Set(); S.step=3; paint();
    S.done.add('0900102'); syncTicks();                 // group 1 pick
    const g1=[...document.querySelectorAll('.stage .crd.is-lock')].map(e=>e.dataset.code);
    S.done=new Set(['1360103']); syncTicks();           // sits in BOTH group 1 and group 2
    const els=[...document.querySelectorAll('.stage .crd[data-code="1360103"]')];
    const shared={locked:[...document.querySelectorAll('.stage .crd.is-lock')].map(e=>e.dataset.code),
                  copies:els.length, bothTicked:els.every(e=>e.classList.contains('is-done'))};
    const out = outstanding();
    return {g1, shared, left: out.need.length+out.open.length};
  });
  ok(r.g1.includes('0200105') && r.g1.includes('1060104'), 'electives group 1 locks after one pick');
  ok(!r.g1.includes('1370101'), 'group 2 stays open when group 1 is filled');
  ok(r.shared.copies===2 && r.shared.bothTicked, 'a course printed in two groups shows ticked in both');
  ok(!r.shared.locked.includes('1370101') && !r.shared.locked.includes('0330101'),
     'and it fills only ONE group — the other stays open');
  ok(r.left===44, 'it counts once: 44 of 45 left, not 43 (got '+r.left+')');

  console.log('page errors:', errs);
  await b.close();
})();
