const { chromium } = require('playwright');
const fs = require('fs');
/* Playwright's Chromium: a pinned build in the cloud sandbox, whatever
   `npx playwright install chromium` put down on a normal machine. */
const PINNED = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const LAUNCH = { args: ['--no-sandbox', '--font-render-hinting=none'] };
if (fs.existsSync(PINNED)) LAUNCH.executablePath = PINNED;
const path = require('path');
(async () => {
  const b = await chromium.launch(LAUNCH);
  const p = await b.newPage({ viewport:{width:1440,height:960} });
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://'+path.join(__dirname,'..','public','index.html'), {waitUntil:'networkidle'});
  await p.waitForTimeout(800);
  const R = await p.evaluate(() => {
    const out=[];
    const run=(major,done,perTerm,summer)=>{
      S.major=major;S.done=new Set(done);S.freeDone=0;S.perTerm=perTerm;S.summer=summer;S.start=0;
      const o=outstanding(), pl=schedule();
      const placed=pl.reduce((a,t)=>a+t.list.length,0);
      const badCap=pl.filter(t=>t.list.length>(t.T.cap==='s'?summer:perTerm)).map(t=>t.T.en);
      const seen=new Set(done), viol=[];
      pl.forEach(t=>{const add=[];t.list.forEach(x=>{if(!x.c)return;
        PRE(x.c).forEach(q=>{if(!seen.has(q))viol.push(x.c+'<'+q);});
        const c=CO(x.c); if(c.after_credits&&seen.size<Math.ceil(c.after_credits/3))viol.push(x.c+' early');
        add.push(x.c);});add.forEach(z=>seen.add(z));});
      const codes=pl.flatMap(t=>t.list.map(x=>x.c)).filter(Boolean);
      const dup=[...new Set(codes.filter((c,i)=>codes.indexOf(c)!==i))];
      out.push({major,done:done.length,perTerm,summer,slots:totalSlots(),
        left:o.need.length+o.open.length,terms:pl.length,placed,
        finish:pl.length?pl[pl.length-1].T.en:'-',badCap,violN:viol.length,viol:viol.slice(0,4),dup,
        stuck:pl.some(t=>t.stuck)});
    };
    run('mis',[],5,2); run('mis',[],6,3); run('mis',[],4,0);
    run('oscm',[],5,2); run('oscm',[],6,3); run('oscm',[],1,0);
    const g=P.general.slice(0,20);
    run('mis',g.concat(['1013230','1013331'],P.electives.must),5,2);
    run('oscm',g.concat(['1013310','1013321'],P.electives.must),5,2);
    return out;
  });
  const bad = R.filter(r=>r.violN||r.badCap.length||r.dup.length||r.stuck||r.placed!==r.left);
  console.log(R.map(r=>`${r.major} done=${r.done} ${r.perTerm}/${r.summer} -> left ${r.left}, ${r.terms} terms, ${r.finish}`).join('\n'));
  console.log(bad.length ? 'FAIL '+JSON.stringify(bad,null,1) : 'ALL SCENARIOS CLEAN');
  console.log('page errors:', errs);
  await b.close();
})();
