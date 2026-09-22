#!/usr/bin/env node
/* ============================================================
   ISOM دليل الطالب — build (rev 2)
   node build.js && node render.js mis
   ============================================================ */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname, DIST = path.join(ROOT, 'dist');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/courses.json'), 'utf8'));
const M = data.mis;
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
/* Arabic text takes Arabic-Indic digits */
const ar = n => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);

/* ---------- row plan ----------
   1 sem2 · 2 sem3 · 3 sem4 · 4 path headers · 5 sem5 · 6 sem6–7
   7 sem8 · 8 electives · 9 supporting                         */
const ROW_OF = { 1: 2, 2: 3, 3: 4, 4: 6, 5: 7, 6: 8 };   /* row 1 is the gateway band */
const STRIPE = ['rgba(102,0,0,.055)','rgba(102,0,0,.085)','rgba(102,0,0,.115)','rgba(102,0,0,.145)','rgba(102,0,0,.175)','rgba(102,0,0,.205)'];
const BANDBG = ['#E4CDCD', '#D9B9B9', '#CEA5A5', '#C39191', '#B87D7D', '#AD6A6A'];
const BANDS = [
  { r: 2, n: '1', l: 'Level', ar: 'المستوى', i: 0 },
  { r: 3, n: '2', l: 'Level', ar: 'المستوى', i: 1 },
  { r: 4, n: '3', l: 'Level', ar: 'المستوى', i: 2 },
  { r: 6, n: '4', l: 'Level', ar: 'المستوى', i: 3 },
  { r: 7, n: '5', l: 'Level', ar: 'المستوى', i: 4 },
  { r: 8, n: '6', l: 'Level', ar: 'المستوى', i: 5 },
];

/* ---------- card ---------- */
function card(c, place, wide) {
  const first = c.role === 'entry'
    ? `<div class="crd__first"><span>Take this one first</span><span class="ar">ابدأ بهذا</span></div>` : '';
  const note = c.note ? `<div class="crd__note">${esc(c.note)}</div>` : '';
  const chips = (c.chips && c.chips.length)
    ? `<div class="needs">${c.chips.map(code => {
        const src = CHIPCAT[code] || 'core';
        return `<span class="need" style="--nc:var(--c-${src})"><i class="need__sw"></i><b class="need__c">${code}</b></span>`;
      }).join('')}</div>` : '';
  const need = c.need ? `<div class="crd__need"><b>${esc(c.need[0])}</b><span>${esc(c.need[1])}</span></div>` : '';
  const flag = c.flag
    ? `<div class="crd__flag">${esc(c.flag.en)}<b>${esc(c.flag.ar)}</b></div>` : '';
  const opens = c.opens
    ? `<div class="crd__opens"><img src="../assets/isom-logo.png" alt="ISOM Club"><span>${esc(c.opens.en)}<b>${esc(c.opens.ar)}</b></span></div>` : '';
  const from = c.gate
    ? `<div class="crd__from"><img src="../assets/isom-logo.png" alt="ISOM Club"><span>General Courses page &nbsp;·&nbsp; 03<b>صفحة المقررات العامة</b></span></div>` : '';
  return `
  <div class="crd cat-${c.cat}${c.capstone ? ' crd--capstone' : ''}${wide ? ' crd--wide' : ''}${c.gate ? ' crd--gate' : ''}" data-code="${c.code}" style="${place}">
    <div class="crd__top"><span class="crd__code">${c.code}</span><span class="crd__cr">${c.cr == null ? '&mdash;' : c.cr + ' CR'}</span></div>
    ${first}
    <div class="crd__body">
      <div class="crd__names"><div class="crd__en">${esc(c.en)}</div><div class="crd__ar">${esc(c.ar)}</div></div>
      ${note}${need}${chips}${from}${opens}${flag}
    </div>
  </div>`;
}
const place = (r, col, span) => `grid-row:${r};grid-column:${col}/${col + span}`;
/* which colour a prerequisite tag should wear — the colour of ITS column */
const CHIPCAT = {};
(data.general ? data.general.courses : []).forEach(c => CHIPCAT[c.code] = c.cat);

/* ---------- rail ---------- */
const stepsPanel = () => `
  <div class="panel panel--accent">
    <div class="panel__h">What you must do</div>
    <div class="panel__h-ar">ما الذي يجب عليك دراسته</div>
    <ol class="steps">
      ${M.rules.map(([en, ar]) => `<li>${esc(en)}<span class="ar">${esc(ar)}</span></li>`).join('')}
    </ol>
  </div>`;

const KEY = [
  ['var(--c-core)', 'ALL', 'Red — you must take every one', 'الأحمر — جميعها إجبارية'],
  ['var(--c-analytics)', 'PATH', 'Green path — pick this one or blue', 'المسار الأخضر — اختره أو الأزرق'],
  ['var(--c-appdev)', 'PATH', 'Blue path — pick this one or green', 'المسار الأزرق — اختره أو الأخضر'],
  ['var(--c-elective)', 'PICK 1', 'Yellow — pick only one of them', 'الأصفر — اختر واحداً فقط'],
  ['var(--c-support)', 'BOTH', 'Olive — take both of them', 'الزيتوني — ادرس كليهما'],
];
const keyPanel = () => `
  <div class="panel panel--accent">
    <div class="panel__h">What the colours mean</div>
    <div class="panel__h-ar">معنى الألوان</div>
    <div class="key">
      ${KEY.map(([bg, chip, en, ar]) => `
      <div class="key__row">
        <span class="key__chip" style="background:${bg}">${chip}</span>
        <span class="key__txt"><span class="key__en">${en}</span><span class="key__ar">${ar}</span></span>
      </div>`).join('')}
      <div class="key__row">
        <span class="key__wire"></span>
        <span class="key__txt"><span class="key__en">The line means: finish that course first</span><span class="key__ar">الخط يعني: ادرس المقرر السابق أولاً</span></span>
      </div>
    </div>
  </div>`;

const SHAPE = [[61, 'General courses', 'المقررات العامة', '#D8C9C9'], [36, 'College courses', 'مقررات الكلية', '#A97B7B'], [27, 'Your major', 'مقررات التخصص', '#660000'], [6, 'Supporting', 'المقررات المساندة', '#55632B']];
const shapePanel = () => `
  <div class="panel panel--accent">
    <div class="panel__h">Your whole degree</div>
    <div class="panel__h-ar">درجتك كاملة</div>
    <div class="shape">
      ${SHAPE.map(([n, en, ar, col]) => `
      <div class="shape__row">
        <span class="shape__sw" style="background:${col}"></span>
        <span class="shape__n">${n}</span>
        <span><span class="shape__t">${en}</span><span class="shape__a">${ar}</span></span>
      </div>`).join('')}
    </div>
    <div class="shape__tot"><span><b>130</b> credits to graduate</span><span style="font-family:Tajawal;direction:rtl"><b>١٣٠</b> وحدة للتخرج</span></div>
  </div>`;

/* ---------- wires ---------- */
function wireList() {
  const out = [];
  const inMap = {};
  M.courses.forEach(c => inMap[c.code] = true);
  M.courses.forEach(c => c.pre.forEach(p => { if (inMap[p]) out.push({ s: p, t: c.code, k: 'wire--hard' }); }));
  // whichever two of the three you take, the path leads to the capstone —
  // so all three feed one bundle that leaves from the middle course
  M.gateway.wires.forEach(w => out.push({ s: w.s, t: w.t, k: 'wire--hard' }));
  out.push({ bundle: 1, srcs: ['1013440', '1013441', '1013442'], stem: '1013441', t: '1013472', k: 'wire--soft', entry: 0.30, lane: 0 });
  out.push({ bundle: 1, srcs: ['1013452', '1013453', '1013454'], stem: '1013453', t: '1013472', k: 'wire--soft', entry: 0.70, lane: 1 });
  return out;
}

/* ---------- page ---------- */
function misPage() {
  const el = M.electives, sup = M.support;
  return `
<section class="page">
  <div class="wm">
    <img class="m2" src="../assets/isom-maroon.png" alt="">
    <img class="g4" src="../assets/gear-maroon.png" alt="">
    <img class="g2" src="../assets/gear-maroon.png" alt="">
    <img class="g1" src="../assets/gear-maroon.png" alt="">
    <img class="g5" src="../assets/gear-maroon.png" alt="">
    <img class="m1" src="../assets/isom-maroon.png" alt="">
    <img class="g3" src="../assets/gear-maroon.png" alt="">
  </div>

  <header class="hd">
    <img class="hd__club" src="../assets/isom-logo.png" alt="ISOM Club">
    <div class="hd__titles">
      <h1 class="hd__en">${esc(M.title_en)}</h1>
      <div class="hd__ar">${esc(M.title_ar)}</div>
      <div class="hd__meta">Your course map · 2026 / 2027 · خريطة مقرراتك</div>
    </div>
    <img class="hd__crest" src="../assets/ku-logo.png" alt="Kuwait University — College of Business Administration">
  </header>

  <div class="body">
    <aside class="rail">${stepsPanel()}${keyPanel()}${shapePanel()}</aside>

    <div class="canvas canvas--stack">
      <div class="grid" id="grid">
        ${gateBand(M.gateway, M.gateway.lead)}
        ${BANDS.map(b => `<div class="stripe" style="grid-row:${b.r};--tint:${STRIPE[b.i]}"></div>`).join('')}
        ${BANDS.map(b => `<div class="band" style="grid-row:${b.r};--tint-strong:${BANDBG[b.i]};--band-ink:#4A0000">
            <span class="band__l">${b.l}</span><span class="band__n">${b.n}</span><span class="band__ar">${b.ar}</span></div>`).join('')}
        <div class="stripe" style="grid-row:9;--tint:rgba(169,116,26,.12)"></div>
        <div class="band" style="grid-row:9;--tint-strong:var(--c-elective);--band-ink:#fff">
          <span class="band__l">Pick</span><span class="band__n">1</span><span class="band__ar">اختر واحداً</span></div>
        <div class="stripe" style="grid-row:10;--tint:rgba(85,99,43,.12)"></div>
        <div class="band" style="grid-row:10;--tint-strong:var(--c-support);--band-ink:#fff">
          <span class="band__l">Take</span><span class="band__n">2</span><span class="band__ar">كلاهما</span></div>

        <div class="zone zone--analytics" style="grid-row:5/8;grid-column:2/5"></div>
        <div class="zone zone--appdev" style="grid-row:5/8;grid-column:7/10"></div>

        <div class="ztag ztag--analytics" style="grid-row:5;grid-column:2/5">
          <span class="ztag__n">PATH 1</span>
          <span><span class="ztag__en">Analytics Path</span> &nbsp;<span class="ztag__ar">مسار تحليل الأعمال</span>
            <span class="ztag__sub">Take the top course, then pick 2 of the 3 below · ادرس المقرر الأول ثم اختر مقررين من الثلاثة</span></span>
        </div>
        <div class="ztag ztag--appdev" style="grid-row:5;grid-column:7/10">
          <span class="ztag__n">PATH 2</span>
          <span><span class="ztag__en">App Development Path</span> &nbsp;<span class="ztag__ar">مسار تطوير التطبيقات</span>
            <span class="ztag__sub">Take the top course, then pick 2 of the 3 below · ادرس المقرر الأول ثم اختر مقررين من الثلاثة</span></span>
        </div>

        <div class="orbox" style="grid-row:7;grid-column:5/7">
          <span class="orbox__or">OR</span>
          <span class="orbox__t">Choose ONE path only.<br>You cannot do both.</span>
          <span class="orbox__a">اختر مساراً واحداً فقط،<br>لا يمكنك دراسة المسارين معاً.</span>
        </div>

        ${M.courses.map(c => card(c, place(ROW_OF[c.row], c.col, c.span), c.span >= 2)).join('')}
        ${el.map((c, i) => card(c, place(9, 2 + i * 2, 2), false)).join('')}
        ${sup.map((c, i) => card(c, place(10, 2 + i * 4, 4), true)).join('')}

        <svg class="wires" id="wires"></svg>
      </div>
      <div class="ladder-note" style="margin-top:1.8mm">
        <span>${esc(M.ladder_note_en)}</span><span>${esc(M.ladder_note_ar)}</span>
      </div>
    </div>
  </div>

  ${footer(M.notes, '01')}
</section>`;
}

/* ---------- connector router (runs in page) ---------- */
const WIRE_JS = `
(function(){
function draw(){
  var grid=document.getElementById('grid'), svg=document.getElementById('wires'); if(!grid||!svg) return;
  var gb=grid.getBoundingClientRect(), NS='http://www.w3.org/2000/svg';
  svg.setAttribute('viewBox','0 0 '+gb.width+' '+gb.height);
  svg.style.width=gb.width+'px'; svg.style.height=gb.height+'px';
  var CATS=['core','lang','math','acct','econ','biz','analytics','appdev','elective','support'];
  var head=function(id,fill){return '<marker id="'+id+'" viewBox="0 0 10 10" refX="7.6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,1.4 L8.6,5 L0,8.6 z" fill="'+fill+'"/></marker>';};
  svg.innerHTML='<defs>'+head('ah','var(--wire-hard)')+head('ahs','var(--wire)')
    +CATS.map(function(k){return head('ah-'+k,'var(--c-'+k+')')}).join('')+'</defs>';

  var box={}; grid.querySelectorAll('.crd[data-code]').forEach(function(e){var r=e.getBoundingClientRect();
    box[e.dataset.code]={x:r.left-gb.left,y:r.top-gb.top,w:r.width,h:r.height};});

  /* anything a wire must never cross — labels AND cards. A wire may of course
     touch the card it starts at and the card it points to, so those are skipped
     per wire. */
  var obs=[];
  grid.querySelectorAll('.ztag,.orbox,.gatebox,.startbox,.stag').forEach(function(e){var r=e.getBoundingClientRect();
    obs.push({x:r.left-gb.left-4,y:r.top-gb.top-4,w:r.width+8,h:r.height+8,code:null});});
  grid.querySelectorAll('.crd[data-code]').forEach(function(e){var r=e.getBoundingClientRect();
    obs.push({x:r.left-gb.left-3,y:r.top-gb.top-3,w:r.width+6,h:r.height+6,code:e.dataset.code});});

  var add=function(d,cls,a,col,key,srcs){var p=document.createElementNS(NS,'path');p.setAttribute('d',d);p.setAttribute('class',cls);
    if(col)p.style.stroke=col;
    if(key)p.setAttribute('data-bus',key);
    if(srcs)p.setAttribute('data-srcs',srcs.join(','));
    if(a)p.setAttribute('marker-end','url(#'+a+')');svg.appendChild(p);};
  var dot=function(x,y,soft,col){var c=document.createElementNS(NS,'circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',1.7);
    if(col)c.style.fill=col; else if(soft)c.setAttribute('fill','var(--wire)');svg.appendChild(c);};
  var cx=function(b){return b.x+b.w/2}, bot=function(b){return b.y+b.h}, tp=function(b){return b.y-2};

  function blockers(x,y0,y1,skip){ return obs.filter(function(o){
    if(o.code && skip && skip.indexOf(o.code)>=0) return false;
    return x>o.x && x<o.x+o.w && y1>o.y && y0<o.y+o.h; }); }

  /* A vertical run that respects labels. If the label sits squarely on the
     line it becomes a station: the wire stops at its top edge and carries on
     from its bottom edge. Otherwise the wire steps around it.
     Returns an array of path strings; the last one carries the arrowhead. */
  function vpath(x,y0,y1,skip){
    var b=blockers(x,y0,y1,skip);
    if(!b.length) return ['M'+x+','+y0+' L'+x+','+y1];
    var top=Math.min.apply(null,b.map(function(o){return o.y}));
    var bt =Math.max.apply(null,b.map(function(o){return o.y+o.h}));
    var L=Math.min.apply(null,b.map(function(o){return o.x}));
    var R=Math.max.apply(null,b.map(function(o){return o.x+o.w}));
    var mid=(L+R)/2, wide=R-L;
    if(Math.abs(x-mid) < wide*0.3){
      var segs=[];
      if(top-y0>3) segs.push('M'+x+','+y0+' L'+x+','+top);
      if(y1-bt>3) segs.push('M'+x+','+bt+' L'+x+','+y1);
      return segs.length?segs:['M'+x+','+y0+' L'+x+','+y1];
    }
    var dx=(x-L)<=(R-x)?L-3:R+3;
    top=Math.max(top,y0+4); bt=Math.min(bt,y1-4);
    if(bt-top<4||Math.abs(dx-x)<4) return ['M'+x+','+y0+' L'+x+','+y1];
    var r=Math.min(2.6,Math.abs(dx-x)/2,(bt-top)/2), sg=dx>x?1:-1;
    return ['M'+x+','+y0
     +' L'+x+','+(top-r)+' Q'+x+','+top+' '+(x+sg*r)+','+top
     +' L'+(dx-sg*r)+','+top+' Q'+dx+','+top+' '+dx+','+(top+r)
     +' L'+dx+','+(bt-r)+' Q'+dx+','+bt+' '+(dx-sg*r)+','+bt
     +' L'+(x+sg*r)+','+bt+' Q'+x+','+bt+' '+x+','+(bt+r)
     +' L'+x+','+y1];
  }
  function addV(x,y0,y1,cls,arrow,skip,col,key,srcs){
    var ps=vpath(x,y0,y1,skip);
    ps.forEach(function(d,i){ add(d,cls, i===ps.length-1?arrow:null, col, key, srcs); });
  }

  var tgt={}, solos=[], bundles=[];
  (window.__WIRES__||[]).forEach(function(w){
    if(w.bundle){ bundles.push(w); return; }
    if(!box[w.s]||!box[w.t])return;
    if(w.solo){solos.push(w);return;}
    var e=(tgt[w.t]=tgt[w.t]||{s:[],k:w.k,cats:[]}); e.s.push(w.s); e.cats.push(w.cat||''); });
  var buses={};
  Object.keys(tgt).forEach(function(t){ var key=tgt[t].s.slice().sort().join('|');
    (buses[key]=buses[key]||{key:key,srcs:tgt[t].s,ts:[],k:tgt[t].k,cats:tgt[t].cats}).ts.push(t); });

  var busList=Object.keys(buses).map(function(k){return buses[k]});

  /* A course that feeds more than one group sends each group out of a different
     point along its bottom edge. Two runs then never leave the same spot, so
     one can never appear to cut through the other. */
  var srcUse={}, tgtUse={};
  busList.forEach(function(b){
    b.srcs.forEach(function(s){ (srcUse[s]=srcUse[s]||[]).push(b); });
    b.ts.forEach(function(t){ (tgtUse[t]=tgtUse[t]||[]).push(b); });
  });
  var meanX=function(codes){var t=0;codes.forEach(function(c){t+=box[c].x+box[c].w/2});return t/codes.length;};
  /* THE EXIT MUST MATCH THE DIRECTION. The run that heads right leaves from the
     right of the card; the one that heads left leaves from the left. Assign the
     lanes in any other order and the two runs swap sides and cross each other
     directly under the card. */
  var srcLane={}, tgtLane={};
  var assign=function(use,store,pull){
    Object.keys(use).forEach(function(code){
      var r=box[code], list=use[code].slice();
      list.sort(function(a,b){ return meanX(pull(a))-meanX(pull(b)); });
      list.forEach(function(b,i){
        store[code+'|'+b.key] = list.length>1 ? r.x + r.w*((i+1)/(list.length+1)) : r.x + r.w/2;
      });
    });
  };
  assign(srcUse, srcLane, function(b){return b.ts});
  assign(tgtUse, tgtLane, function(b){return b.srcs});
  var lane=function(store,code,b){ return store[code+'|'+b.key]; };

  busList.forEach(function(b){
    b.S=b.srcs.map(function(x){return box[x]}); b.T=b.ts.map(function(x){return box[x]});
    b.SX=b.srcs.map(function(c){return lane(srcLane,c,b)});
    b.TX=b.ts.map(function(c){return lane(tgtLane,c,b)});
    var xs=b.SX.concat(b.TX);
    b.lo=Math.min.apply(null,xs); b.hi=Math.max.apply(null,xs);
    b.mb=Math.max.apply(null,b.S.map(bot));
  });
  /* Deciding which run is drawn nearer the cards. For an upper run U and a
     lower run L, two things must both hold, or a line gets cut:
       - L's horizontal must not pass under where U drops into its cards
       - U's horizontal must not pass over where L climbs out of its cards
     (U's drops reach down past L's line; L's climbs reach up past U's line.) */
  var inSpan=function(x,b){ return x>b.lo-1 && x<b.hi+1; };
  var okAbove=function(u,l){
    if(u.TX.some(function(x){return inSpan(x,l);})) return false;
    if(l.SX.some(function(x){return inSpan(x,u);})) return false;
    return true;
  };
  /* Only runs that leave the same row of cards can collide, so order each of
     those groups on its own — otherwise an unrelated run blocks the reordering. */
  var gaps={};
  busList.forEach(function(b){ var g=Math.round(b.mb/6); (gaps[g]=gaps[g]||[]).push(b); });
  busList=[];
  Object.keys(gaps).map(Number).sort(function(a,b){return a-b;}).forEach(function(g){
    var grp=gaps[g];
    for(var pa=0;pa<grp.length;pa++){
      for(var pb=0;pb<grp.length-1;pb++){
        var u=grp[pb], v=grp[pb+1], swap=false;
        if(!okAbove(u,v) && okAbove(v,u)) swap=true;
        else if(okAbove(u,v) && okAbove(v,u)){
          var du=(u.srcs.length>1?0:1), dv=(v.srcs.length>1?0:1);
          if(dv<du) swap=true; else if(dv===du && v.lo<u.lo) swap=true;
        }
        if(swap){ grp[pb]=v; grp[pb+1]=u; }
      }
    }
    grp.forEach(function(b){ busList.push(b); });
  });

  var placed=[];
  busList.forEach(function(b){
    var S=b.S, T=b.T, SX=b.SX, TX=b.TX;
    var mb=Math.max.apply(null,S.map(bot)), mt=Math.min.apply(null,T.map(tp));
    if(mt-mb<5) return;
    var x0=b.lo, x1=b.hi;
    var ends=b.srcs.concat(b.ts);
    var y=Math.min(mb+(mt-mb)/2, mb+13);
    for(var pass=0;pass<4;pass++){
      obs.forEach(function(o){
        if(o.code && ends.indexOf(o.code)>=0) return;
        if(x1>o.x && x0<o.x+o.w && y>o.y && y<o.y+o.h) y=Math.min(o.y+o.h+4, mt-4);
      });
    }
    for(var g=0;g<10;g++){
      var clash=placed.some(function(q){return Math.abs(q.y-y)<3.4 && x1>q.x0-2 && x0<q.x1+2;});
      if(!clash) break;
      if(y+4.2>mt-4) break;
      y+=4.2;
    }
    placed.push({x0:x0,x1:x1,y:y});

    var one = b.srcs.length===1 && b.cats[0];
    var col = one ? 'var(--c-'+b.cats[0]+')' : null;
    var arw = one ? 'ah-'+b.cats[0] : (b.k==='wire--soft'?'ahs':'ah');
    if(x1-x0>1.5) add('M'+x0+','+y+' L'+x1+','+y,b.k,null,col,b.key,b.srcs);
    S.forEach(function(s,i){
      var sc = col || (b.cats[i] ? 'var(--c-'+b.cats[i]+')' : null);
      addV(SX[i],bot(s),y,b.k,null,ends,sc,b.key,b.srcs);
      if(x1-x0>1.5) dot(SX[i],y,false,sc); });
    T.forEach(function(t,i){ addV(TX[i],y,tp(t),b.k,arw,ends,col,b.key,b.srcs); });
  });

  /* every course in a path bundles into one line that leaves from the middle
     course and carries on to the capstone */
  bundles.forEach(function(b){
    var S=b.srcs.map(function(c){return box[c]}).filter(Boolean), T=box[b.t];
    if(!S.length||!T||!box[b.stem]) return;
    var mb=Math.max.apply(null,S.map(bot));
    var busY=mb+11;
    var ey=tp(T);
    if(ey-busY<18) busY=mb+10;
    var xs=S.map(cx), x0=Math.min.apply(null,xs), x1=Math.max.apply(null,xs);
    var bk='bundle'+b.lane+':'+b.t;
    S.forEach(function(s){ add('M'+cx(s)+','+bot(s)+' L'+cx(s)+','+busY,b.k,null,null,bk,b.srcs); });
    add('M'+x0+','+busY+' L'+x1+','+busY,b.k,null,null,bk,b.srcs);
    S.forEach(function(s){ dot(cx(s),busY,true); });
    var sx=cx(box[b.stem]), ex=T.x+T.w*b.entry;
    var my=busY+(ey-busY)*(0.62+0.16*b.lane);
    var r=Math.min(5,Math.abs(ex-sx)/2,Math.abs(my-busY),Math.abs(ey-my)), g=ex>sx?1:-1;
    var d='M'+sx+','+busY+' L'+sx+','+(my-r)+' Q'+sx+','+my+' '+(sx+g*r)+','+my
         +' L'+(ex-g*r)+','+my+' Q'+ex+','+my+' '+ex+','+(my+r)+' L'+ex+','+ey;
    add(d,b.k,'ahs',null,bk,b.srcs);
  });

  var tally={}; solos.forEach(function(w){tally[w.t]=(tally[w.t]||0)+1}); var seen={};
  solos.forEach(function(w){ var s=box[w.s], t=box[w.t];
    var n=tally[w.t], i=(seen[w.t]=(seen[w.t]||0)+1)-1;
    var sy=bot(s), ey=tp(t), sx=cx(s), ex=n>1?t.x+t.w*((i+1)/(n+1)):cx(t);
    if(ey-sy<5) return;
    var my=sy+(ey-sy)*(n>1?0.55+0.22*i:0.6);
    for(var pass=0;pass<3;pass++){
      obs.forEach(function(o){
        if(Math.max(sx,ex)>o.x && Math.min(sx,ex)<o.x+o.w && my>o.y && my<o.y+o.h) my=Math.min(o.y+o.h+4, ey-4);
      });
    }
    var r=Math.min(5,Math.abs(ex-sx)/2,Math.abs(my-sy),Math.abs(ey-my)), g=ex>sx?1:-1, d;
    if(Math.abs(ex-sx)<1.5){ addV(sx,sy,ey,w.k,'ahs',[w.s,w.t]); return; }
    d='M'+sx+','+sy+' L'+sx+','+(my-r)+' Q'+sx+','+my+' '+(sx+g*r)+','+my+' L'+(ex-g*r)+','+my+' Q'+ex+','+my+' '+ex+','+(my+r)+' L'+ex+','+ey;
    add(d,w.k,'ahs'); });

  document.documentElement.setAttribute('data-wires','done');
}
if(document.readyState==='complete') draw(); else window.addEventListener('load',draw);
})();`;

const EXTRA_CSS = `
.shape{display:flex;flex-direction:column;gap:1.3mm;margin-top:.2mm}
.shape__row{display:grid;grid-template-columns:3.4mm 8mm 1fr;gap:2.4mm;align-items:baseline}
.shape__sw{width:3.4mm;height:3.4mm;border-radius:.8mm;align-self:center}
.shape__n{font-family:BarlowC;font-weight:700;font-size:15pt;color:var(--maroon);text-align:right;line-height:1}
.shape__t{font-family:Aleo;font-weight:700;font-size:8pt;line-height:1.2;display:block}
.shape__a{font-family:Tajawal;font-size:8pt;color:#554C4A;direction:rtl;text-align:right;display:block;line-height:1.4}
.shape__bar{display:flex;height:2.6mm;border-radius:9mm;overflow:hidden;margin:2.4mm 0 1mm}
.shape__tot{margin-top:2.2mm;padding-top:1.8mm;border-top:.25mm solid var(--rule);font-family:DMSans;font-size:7pt;color:var(--ink-soft);display:flex;justify-content:space-between}
.shape__tot b{color:var(--maroon);font-weight:700}
`;


/* ---------- the band that shows what opens a major ---------- */
function gateBand(G, cols) {
  return `
  <div class="stripe" style="grid-row:1;--tint:rgba(0,0,0,.035)"></div>
  <div class="band band--gate" style="grid-row:1">
    <span class="band__l">Before</span><img class="band__mark" src="../assets/isom-logo.png" alt="ISOM Club"><span class="band__ar">قبل البداية</span></div>
  ${G.courses.map(c => card(c, place(1, c.col, c.span), c.span >= 3)).join('')}
  <div class="gatelead" style="${place(1, cols[0], cols[1])}">
    <span class="gatelead__h">${esc(G.en)}</span><span class="gatelead__ha">${esc(G.ar)}</span>
    <span class="gatelead__en">${esc(G.note_en)}</span><span class="gatelead__ar">${esc(G.note_ar)}</span>
  </div>`;
}

/* ---------- shared chrome ---------- */
function header(t_en, t_ar, meta) {
  return `
  <header class="hd">
    <img class="hd__club" src="../assets/isom-logo.png" alt="ISOM Club">
    <div class="hd__titles">
      <h1 class="hd__en">${esc(t_en)}</h1>
      <div class="hd__ar">${esc(t_ar)}</div>
      <div class="hd__meta">${esc(meta || 'Your course map · 2026 / 2027 · خريطة مقرراتك')}</div>
    </div>
    <img class="hd__crest" src="../assets/ku-logo.png" alt="Kuwait University">
  </header>`;
}
function watermarks() {
  return `
  <div class="wm">
    <img class="m2" src="../assets/isom-maroon.png" alt="">
    <img class="g4" src="../assets/gear-maroon.png" alt="">
    <img class="g2" src="../assets/gear-maroon.png" alt="">
    <img class="g1" src="../assets/gear-maroon.png" alt="">
    <img class="g5" src="../assets/gear-maroon.png" alt="">
    <img class="m1" src="../assets/isom-maroon.png" alt="">
    <img class="g3" src="../assets/gear-maroon.png" alt="">
  </div>`;
}
const SITE = data.site;
function footer(notes, pageNo) {
  return `
  <footer class="ft">
    <a class="ft__scan" href="${SITE.url}">
      <img class="ft__qr" src="../assets/qr.png" alt="${SITE.short}">
      <span class="ft__scanT">
        <span class="ft__scanH">${esc(SITE.name_en)}</span>
        <span class="ft__scanA">${esc(SITE.name_ar)}</span>
        <span class="ft__scanL">${esc(SITE.line_en)}<b>${esc(SITE.line_ar)}</b></span>
        <span class="ft__scanU">${esc(SITE.short)}</span>
      </span>
    </a>
    <div class="ft__txt"><b>ISOM Club</b> · Kuwait University<br>College of Business Administration<br>
      <span style="color:var(--ink-faint)">Checked against the CBA major plan and the KU registration system, September 2026.</span></div>
    <div class="ft__changed">
      <h4>Good to know &nbsp;·&nbsp; <span style="font-family:Tajawal;direction:rtl;unicode-bidi:isolate">معلومات مهمة</span></h4>
      <div class="ft__grid">${notes.map(c => `<div class="ft__item">${esc(c.en)}<span class="ar">${esc(c.ar)}</span></div>`).join('')}</div>
    </div>
    <div class="ft__page">${pageNo}</div>
  </footer>`;
}
function stepsFrom(rules) {
  return `
  <div class="panel panel--accent">
    <div class="panel__h">What you must do</div>
    <div class="panel__h-ar">ما الذي يجب عليك دراسته</div>
    <ol class="steps">
      ${rules.map(([en, ar]) => `<li>${esc(en)}<span class="ar">${esc(ar)}</span></li>`).join('')}
    </ol>
  </div>`;
}
function keyFrom(rows, opts) {
  return `
  <div class="panel panel--accent">
    <div class="panel__h">What the colours mean</div>
    <div class="panel__h-ar">معنى الألوان</div>
    <div class="key">
      ${rows.map(([bg, chip, en, ar]) => `
      <div class="key__row">
        <span class="${chip ? 'key__chip' : 'key__sw'}" style="background:${bg}">${chip}</span>
        <span class="key__txt"><span class="key__en">${en}</span><span class="key__ar">${ar}</span></span>
      </div>`).join('')}
      ${(opts && opts.noWire) ? '' : `<div class="key__row">
        <span class="key__wire"></span>
        <span class="key__txt"><span class="key__en">A line means: finish the course it comes from first</span><span class="key__ar">الخط يعني: أنهِ المقرر الذي يبدأ منه أولاً</span></span>
      </div>`}
    </div>
  </div>`;
}

/* ---------- OSCM page ---------- */
const O = data.oscm;
const O_STRIPE = ['rgba(102,0,0,.075)','rgba(102,0,0,.125)','rgba(102,0,0,.175)'];
const O_BAND   = ['#E0C4C4','#CFA3A3','#BE8383'];
const O_KEY = [
  ['var(--c-core)', 'ALL', 'Red — you must take every one', 'الأحمر — جميعها إجبارية'],
  ['var(--c-elective)', 'PICK 3', 'Yellow — pick 3 of these eight', 'الأصفر — اختر ٣ من الثمانية'],
  ['var(--c-support)', 'PICK 2', 'Green — pick 2 of these five', 'الأخضر — اختر مقررين من الخمسة'],
];
function oscmWires() {
  const out = [];
  const inMap = {}; O.core.forEach(c => inMap[c.code] = true);
  O.core.forEach(c => (c.pre || []).forEach(p => {
    if (inMap[p] && c.code !== '1013473') out.push({ s: p, t: c.code, k: 'wire--hard' });
  }));
  O.gateway.wires.forEach(w => out.push({ s: w.s, t: w.t, k: 'wire--hard' }));
  out.push({ bundle: 1, srcs: ['1013316','1013310','1013321','1013415','1013410'],
             stem: '1013410', t: '1013473', k: 'wire--hard', entry: 0.5, lane: 0 });
  return out;
}
function oscmPage() {
  const E = O.electives, T = O.technical;
  return `
<section class="page">
  ${watermarks()}
  ${header(O.title_en, O.title_ar)}
  <div class="body">
    <aside class="rail">${stepsFrom(O.rules)}${keyFrom(O_KEY)}${shapePanel()}</aside>
    <div class="canvas canvas--stack">
      <div class="grid grid--11 grid--roomy" id="grid">
        ${gateBand(O.gateway, O.gateway.lead)}
        ${O.bands.map((b, i) => `<div class="stripe" style="grid-row:${b.r + 1};--tint:${O_STRIPE[i]}"></div>`).join('')}
        ${O.bands.map((b, i) => `<div class="band" style="grid-row:${b.r + 1};--tint-strong:${O_BAND[i]};--band-ink:#4A0000">
            <span class="band__l">${b.l}</span><span class="band__n">${b.n}</span><span class="band__ar">${b.ar}</span></div>`).join('')}
        <div class="stripe" style="grid-row:5;--tint:rgba(169,116,26,.12)"></div>
        <div class="band" style="grid-row:5;--tint-strong:var(--c-elective);--band-ink:#fff">
          <span class="band__l">Pick</span><span class="band__n">3</span><span class="band__ar">اختر ٣</span></div>
        <div class="stripe" style="grid-row:6;--tint:rgba(85,99,43,.12)"></div>
        <div class="band" style="grid-row:6;--tint-strong:var(--c-support);--band-ink:#fff">
          <span class="band__l">Pick</span><span class="band__n">2</span><span class="band__ar">اختر ٢</span></div>

        ${O.core.map(c => card(c, place(c.row + 1, c.col, c.span), c.span >= 3)).join('')}
        <div class="subgrid subgrid--4" style="grid-row:5;grid-column:3/11">${E.map(c => card(c, '', false)).join('')}</div>
        <div class="subgrid" style="grid-row:6;grid-column:2/12;grid-template-columns:repeat(5,1fr)">${T.map(c => card(c, '', false)).join('')}</div>
        <svg class="wires" id="wires"></svg>
      </div>
      <div class="ladder-note" style="margin-top:1.8mm">
        <span>${esc(O.ladder_note_en)}</span><span>${esc(O.ladder_note_ar)}</span>
      </div>
    </div>
  </div>
  ${footer(O.notes, '02')}
</section>`;
}


/* ---------- General & College Courses page ---------- */
const G = data.general;
const G_STRIPE = ['rgba(102,0,0,.055)','rgba(102,0,0,.09)','rgba(102,0,0,.125)','rgba(102,0,0,.165)','rgba(102,0,0,.205)'];
const G_BAND   = ['#E4CDCD','#D8B7B7','#CCA2A2','#C08D8D','#B47878'];
const G_KEY = [
  ['var(--c-lang)', '', 'Blue — English',                        'الأزرق — اللغة الإنجليزية'],
  ['var(--c-math)', '', 'Green — maths and statistics',          'الأخضر — الرياضيات والإحصاء'],
  ['var(--c-core)', '', 'Red — your own department teaches it',  'الأحمر — يُدرّسه قسمك'],
  ['var(--c-biz)',  '', 'Purple — business subjects', 'البنفسجي — مواد إدارة الأعمال'],
  ['var(--c-econ)', '', 'Orange — economics',                    'البرتقالي — الاقتصاد'],
  ['var(--c-acct)', '', 'Brown — accounting',                    'البني — المحاسبة'],
];

/* Every prerequisite is a line. A line carries the colour of the course it
   starts from, so you can always see where it came from; where two courses
   merge into one line the line is neutral maroon. */
function generalWires() {
  const by = {}; G.courses.forEach(c => by[c.code] = c);
  let out = [];
  G.courses.forEach(c => (c.pre || []).forEach(p => {
    if (by[p]) out.push({ s: p, t: c.code, k: 'wire--hard', cat: by[p].cat });
  }));
  /* if A already reaches B the long way round, the direct line says nothing new */
  const adj = {}; out.forEach(e => (adj[e.s] = adj[e.s] || []).push(e.t));
  const reaches = (a, b, skip) => {
    const seen = {}, stack = (adj[a] || []).filter(t => !(a === skip.s && t === skip.t));
    while (stack.length) {
      const n = stack.pop(); if (n === b) return true;
      if (seen[n]) continue; seen[n] = 1;
      (adj[n] || []).forEach(t => stack.push(t));
    }
    return false;
  };
  out = out.filter(e => !reaches(e.s, e.t, e));
  return out;
}

function generalPage() {
  return `
<section class="page" data-streams="1">
  ${watermarks()}
  ${header(G.title_en, G.title_ar)}
  <div class="body">
    <aside class="rail">${stepsFrom(G.rules)}${keyFrom(G_KEY)}${shapePanel()}</aside>
    <div class="canvas canvas--stack">
      <div class="grid grid--13 grid--snug" id="grid">
        ${G.bands.map((b, i) => `<div class="stripe" style="grid-row:${b.r};--tint:${G_STRIPE[i]}"></div>`).join('')}
        ${G.bands.map((b, i) => `<div class="band" style="grid-row:${b.r};--tint-strong:${G_BAND[i]};--band-ink:#4A0000">
            <span class="band__l">${b.l}</span><span class="band__n">${b.n}</span><span class="band__ar">${b.ar}</span>${
            b.tag ? `<span class="band__tag">START HERE<span>ابدأ هنا</span></span>` : ''}</div>`).join('')}

        ${G.courses.map(c => card(c, place(c.band, c.col, c.span), false)).join('')}

        ${G.levelnotes.map(n => `<div class="levelnote" style="${place(n.band, n.col, n.span)}">
            <span class="levelnote__en">${esc(n.en)}</span><span class="levelnote__ar">${esc(n.ar)}</span></div>`).join('')}

        <svg class="wires" id="wires"></svg>
      </div>
      <div class="ladder-note" style="margin-top:1.8mm">
        <span>${esc(G.ladder_note_en)}</span><span>${esc(G.ladder_note_ar)}</span>
      </div>
      <div class="nextstep">
        <span class="nextstep__n">NEXT &nbsp;·&nbsp; بعد ذلك</span>
        <span class="nextstep__en">${esc(G.next.en)}</span>
        <span class="nextstep__ar">${esc(G.next.ar)}</span>
      </div>
    </div>
  </div>
  ${footer(G.notes, '03')}
</section>`;
}

/* ---------- Elective Courses page ---------- */
const EL = data.electives;
const EL_STRIPE = ['rgba(102,0,0,.075)','rgba(31,78,121,.075)','rgba(156,70,20,.075)','rgba(14,110,99,.075)','rgba(85,99,43,.085)'];
const EL_BAND   = ['#8C4A4A','#4A6E92','#B06A42','#4A8E82','#7A8752'];
const EL_KEY = [
  ['var(--c-core)', '', 'Red — take all four',              'الأحمر — ادرس الأربعة كلها'],
  ['var(--c-lang)', '', 'Blue — group 1, pick one',          'الأزرق — المجموعة الأولى، اختر واحداً'],
  ['var(--c-econ)', '', 'Orange — group 2, pick one',        'البرتقالي — المجموعة الثانية، اختر واحداً'],
  ['var(--c-math)', '', 'Green — group 3, pick one',         'الأخضر — المجموعة الثالثة، اختر واحداً'],
  ['var(--c-support)', '', 'Olive — free choice, pick two',  'الزيتوني — اختياري حر، اختر مقررين'],
];

/* Arabic leads on this page: these are other faculties' courses and the
   Arabic name is the official one. */
function elCard(c, cat) {
  return `
  <div class="crd crd--el cat-${cat}" data-code="${c.code}">
    <div class="crd__top"><span class="crd__code">${c.code}</span></div>
    <div class="crd__body">
      <div class="crd__arname">${esc(c.ar)}</div>
      <div class="crd__tr">${esc(c.en)}</div>
    </div>
  </div>`;
}

function electivesPage() {
  const rows = EL.groups.length + 1;
  return `
<section class="page">
  ${watermarks()}
  ${header(EL.title_en, EL.title_ar)}
  <div class="body">
    <aside class="rail">${stepsFrom(EL.rules)}${keyFrom(EL_KEY, { noWire: true })}${shapePanel()}</aside>
    <div class="canvas canvas--stack">
      <div class="grid grid--13" id="grid">
        ${EL.groups.map((g, i) => `
        <div class="stripe" style="grid-row:${i + 1};--tint:${EL_STRIPE[i]}"></div>
        <div class="band" style="grid-row:${i + 1};--tint-strong:${EL_BAND[i]};--band-ink:#fff">
          <span class="band__l">${g.l}</span><span class="band__n">${g.n}</span><span class="band__ar">${g.ar}</span></div>
        <div class="gwrap" style="grid-row:${i + 1};grid-column:2/14;--cat:var(--c-${g.cat})">
          <div class="gtag">
            <span class="gtag__n">${g.l.toUpperCase()} ${g.n}</span>
            <span><span class="gtag__en">${esc(g.en)}</span> &nbsp;<span class="gtag__ar">${esc(g.arname)}</span>
              <span class="gtag__sub">${esc(g.sub_en)} &nbsp;·&nbsp; ${esc(g.sub_ar)}</span></span>
            <span class="gtag__count">${g.courses.length} courses<b>${ar(g.courses.length)} مقرراً</b></span>
          </div>
          <div class="subgrid" style="grid-template-columns:repeat(${g.cols},1fr)">
            ${g.courses.map(c => elCard(c, g.cat)).join('')}
          </div>
        </div>`).join('')}

        <div class="stripe" style="grid-row:${rows};--tint:${EL_STRIPE[4]}"></div>
        <div class="band" style="grid-row:${rows};--tint-strong:${EL_BAND[4]};--band-ink:#fff">
          <span class="band__l">${EL.free.l}</span><span class="band__n">${EL.free.n}</span><span class="band__ar">${EL.free.ar}</span></div>
        <div class="gwrap" style="grid-row:${rows};grid-column:2/14;--cat:var(--c-support)">
          <div class="gtag">
            <span class="gtag__n">PICK 2</span>
            <span><span class="gtag__en">${esc(EL.free.en)}</span> &nbsp;<span class="gtag__ar">${esc(EL.free.arname)}</span></span>
          </div>
          <div class="freebox">
            <span class="freebox__en">${esc(EL.free.body_en)}</span>
            <span class="freebox__ar">${esc(EL.free.body_ar)}</span>
          </div>
        </div>
      </div>
      <div class="ladder-note" style="margin-top:1.8mm">
        <span>${esc(EL.ladder_note_en)}</span><span>${esc(EL.ladder_note_ar)}</span>
      </div>
    </div>
  </div>
  ${footer(EL.notes, '04')}
</section>`;
}


/* ---------- course lookup ----------
   The transfer page must print exactly the same name as the maps do, so it
   pulls the course out of the same data rather than repeating it. */
const COURSE = {};
(function walk(o) {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === 'object') {
    if (o.code && o.ar && o.en) COURSE[o.code] = COURSE[o.code] || o;
    Object.keys(o).forEach(k => walk(o[k]));
  }
})(data);

/* ---------- Page 05 — Changing your major ---------- */
const T = data.transfer;

function warnPanel(rows) {
  return `
  <div class="panel panel--accent">
    <div class="panel__h">Read this first</div>
    <div class="panel__h-ar">اقرأ هذا أولاً</div>
    <div class="key">
      ${rows.map(([en, ar]) => `
      <div class="key__row">
        <span class="key__sw" style="background:var(--maroon)"></span>
        <span class="key__txt"><span class="key__en">${esc(en)}</span><span class="key__ar">${esc(ar)}</span></span>
      </div>`).join('')}
    </div>
  </div>`;
}

function minePanel(o) {
  return `
  <div class="panel panel--accent">
    <div class="panel__h">${esc(o.h_en)}</div>
    <div class="panel__h-ar">${esc(o.h_ar)}</div>
    <div class="mine">
      <div class="mine__row"><img src="../assets/isom-logo.png" alt="ISOM Club"></div>
      ${o.rows.map(([c, en, ar]) => `
      <div class="mine__row">
        <span class="mine__c">${c}</span>
        <span class="mine__t"><span class="mine__en">${esc(en)}</span><span class="mine__ar">${esc(ar)}</span></span>
      </div>`).join('')}
      <div class="mine__foot">${esc(o.foot_en)}<b>${esc(o.foot_ar)}</b></div>
    </div>
  </div>`;
}

function tRow(r) {
  const cls = r.code ? ' tchip--code' : (r.word ? ' tchip--word' : '');
  return `
  <li class="trow">
    <span class="tchip${cls}">${esc(r.chip)}</span>
    <span class="trow__t"><span class="trow__en">${esc(r.en)}</span><span class="trow__ar">${esc(r.ar)}</span></span>
  </li>`;
}

const TIER_TINT = ['rgba(102,0,0,.10)', 'rgba(102,0,0,.075)', 'rgba(102,0,0,.05)'];

function tierBlock() {
  return T.tiers.map((t, i) => `
  <div class="tier" style="--tint:${TIER_TINT[i]}">
    <span class="tier__g">${t.gpa}<span>GPA · المعدل</span></span>
    <span class="tier__m">
      ${t.majors.map(m => `
      <span class="maj${m.ours ? ' maj--ours' : ''}">
        <span class="maj__c">${m.code}</span>
        <span class="maj__t"><span class="maj__en">${esc(m.en)}</span><span class="maj__ar">${esc(m.ar)}</span></span>
      </span>`).join('')}
    </span>
  </div>`).join('');
}

function pickCard(p) {
  const c = COURSE[p.code];
  const fix = p.fix_en ? `<div class="crd__fix">${esc(p.fix_en)}<b>${esc(p.fix_ar)}</b></div>` : '';
  return `
  <div class="crd cat-${p.cat}" data-code="${c.code}">
    <div class="crd__top"><span class="crd__code">${c.code}</span><span class="crd__cr">${c.cr == null ? '&mdash;' : c.cr + ' CR'}</span></div>
    <div class="crd__body">
      <div class="crd__names"><div class="crd__en">${esc(c.en)}</div><div class="crd__ar">${esc(c.ar)}</div></div>
      ${fix}
    </div>
  </div>`;
}

function tCol(o, tc, extra) {
  return `
  <section class="tcol" style="--tc:${tc}">
    <div class="tcol__h">
      <span class="tcol__tag">${esc(o.tag)}</span>
      <span class="tcol__en">${esc(o.h_en)}</span>
      <span class="tcol__ar">${esc(o.h_ar)}</span>
    </div>
    <div class="tcol__sub">
      <span class="tcol__sub-en">${esc(o.sub_en)}</span>
      <span class="tcol__sub-ar">${esc(o.sub_ar)}</span>
    </div>
    <ul class="tlist">${o.rows.map(tRow).join('')}</ul>
    ${extra}
  </section>`;
}

function transferPage() {
  const insideExtra = `
    <div class="tgpa">
      <span class="tgpa__en">${esc(T.inside.tier_en)}</span>
      <span class="tgpa__ar">${esc(T.inside.tier_ar)}</span>
      ${tierBlock()}
    </div>`;
  const outsideExtra = `
    <div class="tpick">
      <div class="trow">
        <span class="tchip tchip--word">${esc(T.outside.pick_chip)}</span>
        <span class="trow__t"><span class="trow__en">${esc(T.outside.pick_en)}</span><span class="trow__ar">${esc(T.outside.pick_ar)}</span></span>
      </div>
      <div class="tpick__cards">${T.outside.pick.map(pickCard).join('')}</div>
    </div>
    <div class="tend">
      <span class="tend__en">${esc(T.outside.end_en)}</span>
      <span class="tend__ar">${esc(T.outside.end_ar)}</span>
    </div>`;
  return `
<section class="page">
  ${watermarks()}
  ${header(T.title_en, T.title_ar, T.meta)}
  <div class="body">
    <aside class="rail">${stepsFrom(T.rules)}${warnPanel(T.warn)}${minePanel(T.ours)}</aside>
    <div class="canvas canvas--stack">
      <div class="tcols">
        ${tCol(T.inside, 'var(--maroon)', insideExtra)}
        ${tCol(T.outside, '#1F4E79', outsideExtra)}
      </div>
      <div class="nextstep">
        <span class="nextstep__n">NEXT · 06</span>
        <span class="nextstep__en">${esc(T.next_en)}</span>
        <span class="nextstep__ar">${esc(T.next_ar)}</span>
      </div>
    </div>
  </div>
  ${footer(T.notes, '05')}
</section>`;
}

/* ---------- Page 06 — Important numbers ---------- */
const N = data.numbers;

function jobsPanel(o) {
  return `
  <div class="panel panel--accent">
    <div class="panel__h">${esc(o.h_en)}</div>
    <div class="panel__h-ar">${esc(o.h_ar)}</div>
    <div class="jobs">
      ${o.rows.map(([d, en, ar]) => `
      <div class="job">
        <span class="job__d">${d}</span>
        <span class="key__txt"><span class="key__en">${esc(en)}</span><span class="key__ar">${esc(ar)}</span></span>
      </div>`).join('')}
      <div class="jobs__foot">${esc(o.foot_en)}<b>${esc(o.foot_ar)}</b></div>
    </div>
  </div>`;
}

function nBox(o, nc) {
  return `
  <section class="nbox" style="--nc:${nc}">
    <span class="nbox__h">${esc(o.h_en)}</span>
    <span class="nbox__ha">${esc(o.h_ar)}</span>
    <span class="nbox__s">${esc(o.sub_en)}</span>
    <span class="nbox__sa">${esc(o.sub_ar)}</span>
    <div class="nbox__rows">
      ${o.rows.map(r => `
      <div class="nrow${r.ours ? ' nrow--ours' : ''}">
        <span class="nrow__d">${r.d}</span>
        <span class="nrow__t"><span class="nrow__en">${esc(r.en)}</span><span class="nrow__ar">${esc(r.ar)}</span></span>
        ${r.ours ? '<img class="nrow__mark" src="../assets/isom-logo.png" alt="ISOM Club">' : ''}
      </div>`).join('')}
    </div>
  </section>`;
}

function numbersPage() {
  const A = N.anat;
  const F = [2, 2, 3];
  return `
<section class="page">
  ${watermarks()}
  ${header(N.title_en, N.title_ar, N.meta)}
  <div class="body">
    <aside class="rail">${stepsFrom(N.rules)}${jobsPanel(N.jobs)}${shapePanel()}</aside>
    <div class="canvas canvas--stack">
      <div class="nstack">
        <div class="anat">
          <div class="anat__h">
            <span class="anat__h-en">${esc(A.h_en)}</span>
            <span class="anat__h-ar">${esc(A.h_ar)}</span>
            <span class="anat__name">${A.code} &nbsp;·&nbsp; ${esc(A.name_en)}</span>
          </div>
          <div class="anat__parts">
            ${A.parts.map((p, i) => `
            <div class="apart cat-${p.cat}" style="--f:${F[i]}">
              <span class="apart__d">${p.d}</span>
              <span class="apart__l">${esc(p.l_en)}</span>
              <span class="apart__la">${esc(p.l_ar)}</span>
              <span class="apart__v">${esc(p.v_en)}</span>
              <span class="apart__va">${esc(p.v_ar)}</span>
            </div>`).join('')}
          </div>
          <div class="anat__foot"><span>${esc(A.foot_en)}</span><span>${esc(A.foot_ar)}</span></div>
        </div>
        <div class="nboxes">
          ${nBox(N.colleges, 'var(--c-lang)')}
          ${nBox(N.depts, 'var(--maroon)')}
          ${nBox(N.majors, 'var(--c-support)')}
        </div>
        <div class="exs">
          ${N.examples.rows.map(r => `
          <div class="ex">
            <span class="ex__c">${r.code}</span>
            <span class="ex__en">${esc(r.en)}</span>
            <span class="ex__ar">${esc(r.ar)}</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="nextstep">
        <span class="nextstep__n">END</span>
        <span class="nextstep__en">${esc(N.next_en)}</span>
        <span class="nextstep__ar">${esc(N.next_ar)}</span>
      </div>
    </div>
  </div>
  ${footer(N.notes, '06')}
</section>`;
}

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'mis.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>ISOM Student Guide — MIS</title>
<link rel="stylesheet" href="../src/guide.css"><style>${EXTRA_CSS}</style></head>
<body>${misPage()}
<script>window.__WIRES__=${JSON.stringify(wireList())};</script>
<script>${WIRE_JS}</script></body></html>`);
fs.writeFileSync(path.join(DIST, 'oscm.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>ISOM Student Guide — OSCM</title>
<link rel="stylesheet" href="../src/guide.css"><style>${EXTRA_CSS}</style></head>
<body>${oscmPage()}
<script>window.__WIRES__=${JSON.stringify(oscmWires())};</script>
<script>${WIRE_JS}</script></body></html>`);
fs.writeFileSync(path.join(DIST, 'general.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>ISOM Student Guide — General Courses</title>
<link rel="stylesheet" href="../src/guide.css"><style>${EXTRA_CSS}</style></head>
<body>${generalPage()}
<script>window.__WIRES__=${JSON.stringify(generalWires())};</script>
<script>${WIRE_JS}</script></body></html>`);
fs.writeFileSync(path.join(DIST, 'electives.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>ISOM Student Guide — Electives</title>
<link rel="stylesheet" href="../src/guide.css"><style>${EXTRA_CSS}</style></head>
<body>${electivesPage()}</body></html>`);
fs.writeFileSync(path.join(DIST, 'transfer.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>ISOM Student Guide — Changing your major</title>
<link rel="stylesheet" href="../src/guide.css"><style>${EXTRA_CSS}</style></head>
<body>${transferPage()}</body></html>`);
fs.writeFileSync(path.join(DIST, 'numbers.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>ISOM Student Guide — Important numbers</title>
<link rel="stylesheet" href="../src/guide.css"><style>${EXTRA_CSS}</style></head>
<body>${numbersPage()}</body></html>`);
console.log('wrote mis + oscm + general + electives + transfer + numbers');
