const {chromium}=require('playwright');const path=require('path');
const fs = require('fs');
/* Playwright's Chromium: a pinned build in the cloud sandbox, whatever
   `npx playwright install chromium` put down on a normal machine. */
const PINNED = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const LAUNCH = { args: ['--no-sandbox', '--font-render-hinting=none'] };
if (fs.existsSync(PINNED)) LAUNCH.executablePath = PINNED;
(async()=>{const b=await chromium.launch(LAUNCH);
const p=await b.newPage({viewport:{width:1600,height:1400}});
await p.goto('file://'+path.join(__dirname,'dist',(process.argv[2]||'mis')+'.html'),{waitUntil:'networkidle'});
const r=await p.evaluate(()=>{
 const MM=v=>+(v/3.7795275591).toFixed(1);
 const g=s=>document.querySelector(s);
 const h=e=>e?MM(e.getBoundingClientRect().height):null;
 const sh=e=>e?MM(e.scrollHeight):null;
 const rail=g('.rail'),grid=g('.grid'),page=g('.page');
 let railNat=0; rail.querySelectorAll(':scope > .panel').forEach(e=>railNat+=e.getBoundingClientRect().height);
 railNat=MM(railNat)+ (rail.children.length-1)*4;
 // tallest natural card per row
 const rows={};
 grid.querySelectorAll('.crd').forEach(c=>{const m=(c.style.gridRow||'').match(/^\d+/); if(!m) return; const rr=m[0];rows[rr]=Math.max(rows[rr]||0,MM(c.getBoundingClientRect().height));});
 return {page:h(page),hd:h(g('.hd')),ft:h(g('.ft')),body:h(g('.body')),
  railBox:h(rail),railNatural:railNat,gridBox:h(grid),gridScroll:sh(grid),rowsNatural:rows,
  pageScroll:sh(page)};
});
console.log(JSON.stringify(r,null,1));await b.close();})();
