/* ===================== GEOMETRY ===================== */
const HALF=30,TILE_LONG=60,TILE_SHORT=30,GAP=3,MAX=12,ROUNDS=MAX+1;
const startDouble=i=>MAX-i;
function buildSet(){const t=[];let id=0;for(let a=0;a<=MAX;a++)for(let b=a;b<=MAX;b++)t.push({a,b,id:id++});return t;}
const pips=t=>t.a+t.b,isDouble=t=>t.a===t.b,isWild=t=>(t.a===12||t.b===12)&&!(t.a===12&&t.b===12),wildOther=t=>t.a===12?t.b:t.a;

let endSeq=0;
const State={scores:{you:0,bot:0},roundIndex:0,hands:{you:[],bot:[]},boneyard:[],placed:[],ends:[],center:null,
  turn:'you',footActive:false,footEndId:null,passes:0,gameOver:false,selected:null,statusOverride:null,
  view:{x:0,y:0,scale:1},lastPlacedId:null};
const Session={matches:[],youWins:0,botWins:0,youPips:0,botPips:0};

function deal(){const s=buildSet();for(let i=s.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[s[i],s[j]]=[s[j],s[i]];}State.hands.you=s.splice(0,7);State.hands.bot=s.splice(0,7);State.boneyard=s;}
function findStarter(){const tgt=startDouble(State.roundIndex);for(let v=tgt;v>=0;v--)for(const w of['you','bot']){const idx=State.hands[w].findIndex(t=>t.a===v&&t.b===v);if(idx>=0)return{who:w,v,idx};}return null;}
function newEnd(o){o.eid=endSeq++;o.foot=o.foot||null;return o;}

function startRound(){
  State.hands={you:[],bot:[]};State.boneyard=[];State.placed=[];State.ends=[];State.center=null;
  State.footActive=false;State.footEndId=null;State.passes=0;State.selected=null;State.lastPlacedId=null;endSeq=0;
  let st=null,tries=0;do{deal();st=findStarter();tries++;}while(!st&&tries<25);
  const v=st.v;State.center=v;State.hands[st.who].splice(st.idx,1);
  State.placed.push({tile:{a:v,b:v,id:'C'},x:0,y:0,lay:'v',center:true});
  const half=TILE_SHORT;
  State.ends.push(newEnd({value:v,x:half+GAP,y:0,dx:1,dy:0,lay:'h',isCenter:true}));
  State.ends.push(newEnd({value:v,x:-half-GAP,y:0,dx:-1,dy:0,lay:'h',isCenter:true}));
  State.ends.push(newEnd({value:v,x:0,y:half+GAP,dx:0,dy:1,lay:'v',isCenter:true}));
  State.ends.push(newEnd({value:v,x:0,y:-half-GAP,dx:0,dy:-1,lay:'v',isCenter:true}));
  State.turn=st.who==='you'?'bot':'you';
  log(`<b>${st.who==='you'?'You':'Bot'}</b> opened on the <b>${v}-${v}</b> — four arms open.`,st.who==='you');
  centerView();render();
  if(State.turn==='bot')setTimeout(botTurn,800);
}

function matchPlan(tile,end){
  if(State.footActive&&end.eid!==State.footEndId)return null;
  const v=end.value;
  if(tile.a===v)return{tile,end,newValue:tile.b,wild:false,matched:v};
  if(tile.b===v)return{tile,end,newValue:tile.a,wild:false,matched:v};
  if(isWild(tile))return{tile,end,newValue:wildOther(tile),wild:true,matched:12};
  return null;
}
function legalPlays(h){const o=[];for(const t of h)for(const e of State.ends){const p=matchPlan(t,e);if(p)o.push(p);}return o;}
const tileHasPlay=t=>State.ends.some(e=>matchPlan(t,e));
const handPips=w=>State.hands[w].reduce((s,t)=>s+pips(t),0);

function placeTile(plan){
  const{tile,end}=plan,dbl=isDouble(tile),lay=end.lay,len=dbl?TILE_SHORT:TILE_LONG;
  const cx=end.x+end.dx*(len/2+GAP),cy=end.y+end.dy*(len/2+GAP);
  let tlay=dbl?(lay==='h'?'v':'h'):lay;
  const placed={tile,x:cx,y:cy,lay:tlay,center:false,innerVal:plan.wild?12:plan.matched,outerVal:plan.newValue,wild:plan.wild,dbl,armdx:end.dx,armdy:end.dy};
  State.placed.push(placed);State.lastPlacedId=tile.id;return{placed,len};
}
function advanceEnd(end,placed,len){end.value=placed.outerVal;end.x=end.x+end.dx*(len+GAP*2);end.y=end.y+end.dy*(len+GAP*2);}
function openFoot(end,placed){
  // push the foot base farther out so the perpendicular leg fan clears neighbouring arms
  const baseX=end.x+end.dx*(TILE_LONG+GAP*2),baseY=end.y+end.dy*(TILE_LONG+GAP*2);
  // the foot end keeps matching the DOUBLE's value until all 3 legs are placed
  end.value=placed.outerVal;end.x=baseX;end.y=baseY;
  end.foot={need:3,done:0,baseX,baseY,armdx:end.dx,armdy:end.dy,doubleVal:placed.outerVal,legEnds:[]};
  State.footActive=true;State.footEndId=end.eid;
}
function applyPlay(plan,who){
  const{tile,end}=plan,h=State.hands[who],i=h.findIndex(t=>t.id===tile.id);if(i>=0)h.splice(i,1);
  const dbl=isDouble(tile);
  if(State.footActive&&end.eid===State.footEndId){
    const f=end.foot,idx=f.done,len=dbl?TILE_SHORT:TILE_LONG;
    // legs lay ALONG the arm direction; the three toes spread perpendicular to it
    const along=(f.armdx!==0)?'h':'v';
    const tlay=dbl?(along==='h'?'v':'h'):along;
    const lane=(idx-1)*(TILE_SHORT+22);
    let cx,cy,endX,endY;
    if(f.armdx!==0){ // horizontal arm: legs extend in x, spread in y
      cx=f.baseX + f.armdx*(len/2+GAP); cy=f.baseY + lane;
      endX=f.baseX + f.armdx*(len+GAP*2); endY=f.baseY + lane;
    } else {         // vertical arm: legs extend in y, spread in x
      cx=f.baseX + lane; cy=f.baseY + f.armdy*(len/2+GAP);
      endX=f.baseX + lane; endY=f.baseY + f.armdy*(len+GAP*2);
    }
    const placed={tile,x:cx,y:cy,lay:tlay,center:false,innerVal:plan.wild?12:f.doubleVal,outerVal:plan.newValue,wild:plan.wild,dbl,armdx:f.armdx,armdy:f.armdy};
    State.placed.push(placed);State.lastPlacedId=tile.id;
    // record the new open end this leg creates (it will go live once the foot completes)
    f.legEnds.push({value:plan.newValue,x:endX,y:endY,dx:f.armdx,dy:f.armdy,lay:along});
    f.done++;
    // NOTE: end.value stays = doubleVal so remaining legs still match the double
    if(f.done>=f.need){
      // foot satisfied: this end is consumed; spawn the three leg ends as real open ends
      State.footActive=false;State.footEndId=null;
      // remove the foot controller end and add the leg ends
      State.ends=State.ends.filter(e=>e.eid!==end.eid);
      f.legEnds.forEach(le=>State.ends.push(newEnd({value:le.value,x:le.x,y:le.y,dx:le.dx,dy:le.dy,lay:le.lay,isCenter:false})));
      log('Chicken foot satisfied — three new ends open up.');
    }
    return finishTurn(who);
  }
  const g=placeTile(plan);
  if(dbl){openFoot(end,g.placed);log(`${who==='you'?'You':'Bot'} played double <b>${tile.a}-${tile.b}</b> — chicken foot! 3 legs needed.`,who==='you');}
  else advanceEnd(end,g.placed,g.len);
  return finishTurn(who);
}
function finishTurn(who){State.passes=0;if(State.hands[who].length===0)return endRound(who);State.selected=null;State.turn=who==='you'?'bot':'you';render();if(State.turn==='bot'&&!State.gameOver)setTimeout(botTurn,760);}

function drawAndPlay(who){
  if(State.boneyard.length){const tile=State.boneyard.pop();State.hands[who].push(tile);log(`${who==='you'?'You':'Bot'} drew a tile.`,who==='you');
    if(tileHasPlay(tile)){
      if(who==='bot'){render();setTimeout(()=>{const ps=legalPlays([tile]);applyPlay((ps.length?ps:legalPlays(State.hands.bot))[0],'bot');},460);return;}
      State.statusOverride=`You drew ${tile.a}-${tile.b} — playable! Tap it, then a glowing end.`;render();return;
    }
    return passTurn(who,true);
  }
  return passTurn(who,true);
}
function passTurn(who,drew){
  log(`${who==='you'?'You':'Bot'} ${drew?'drew & ':''}passed.`,who==='you');
  State.selected=null;
  // A pass only happens when the boneyard is empty (otherwise the player draws instead).
  // The round ends only when a hand is emptied. The sole exception is a genuine deadlock:
  // boneyard empty AND both players pass in a row with no possible move for anyone.
  if(State.boneyard.length===0){
    State.passes++;
    const nobodyCanMove = legalPlays(State.hands.you).length===0 && legalPlays(State.hands.bot).length===0;
    if(State.passes>=2 && nobodyCanMove) return deadlockRound();
  } else {
    State.passes=0;
  }
  State.turn=who==='you'?'bot':'you';render();
  if(State.turn==='bot'&&!State.gameOver)setTimeout(botTurn,680);
}

function chooseBotPlay(plays){return plays.map(p=>({p,s:pips(p.tile)*2-(p.wild?14:0)-(isDouble(p.tile)?4:0)+(State.footActive?20:0)})).sort((a,b)=>b.s-a.s)[0].p;}
function botTurn(){if(State.gameOver)return;const plays=legalPlays(State.hands.bot);if(plays.length){const plan=chooseBotPlay(plays);log(`Bot plays <b>${plan.tile.a}-${plan.tile.b}</b>${plan.wild?' as a wild':''}.`);applyPlay(plan,'bot');}else drawAndPlay('bot');}

function endRound(winner){const loser=winner==='you'?'bot':'you';const pts=handPips(loser);State.scores[loser]+=pts;render();showRoundModal(`${winner==='you'?'You':'Bot'} went out`,winner,pts,false);}
function deadlockRound(){const py=handPips('you'),pb=handPips('bot');State.scores.you+=py;State.scores.bot+=pb;render();showRoundModal('No moves left',py<=pb?'you':'bot',null,true,{py,pb});}
function nextRoundOrEnd(){State.roundIndex++;if(State.roundIndex>=ROUNDS)return showGameOver();startRound();}

/* ===================== RENDER ===================== */
const el=id=>document.getElementById(id);
function pipLayout(n){const g={0:[0,0,0,0,0,0,0,0,0],1:[0,0,0,0,1,0,0,0,0],2:[1,0,0,0,0,0,0,0,1],3:[1,0,0,0,1,0,0,0,1],4:[1,0,1,0,0,0,1,0,1],5:[1,0,1,0,1,0,1,0,1],6:[1,0,1,1,0,1,1,0,1]};return g[n]||null;}
function halfEl(val,wild){const half=document.createElement('div');half.className='half'+(wild?' wildmark':'');const lay=pipLayout(val);if(lay){for(let i=0;i<9;i++){const c=document.createElement('span');if(lay[i])c.className='pip';half.appendChild(c);}}else{const n=document.createElement('span');n.className='num';n.textContent=val;half.appendChild(n);}return half;}
function tileBody(v1,v2,lay,wi,wo){const body=document.createElement('div');body.className='body '+lay;const h1=halfEl(v1,wi),dv=document.createElement('div');dv.className='divider';const h2=halfEl(v2,wo);body.appendChild(h1);body.appendChild(dv);body.appendChild(h2);return body;}

function renderBoard(){
  const layer=el('boardLayer');layer.innerHTML='';
  State.placed.forEach(p=>{
    const wrap=document.createElement('div');wrap.className='tile'+(p.center?' center':'')+(p.tile.id===State.lastPlacedId?' lastplayed':'');
    let v1,v2,wi=false,wo=false;
    if(p.center){v1=p.tile.a;v2=p.tile.b;}
    else{
      // inner half (matching value, or the 12 for a wild) must face BACK toward center.
      // DOM draws v1 first (left for 'h', top for 'v'); center lies opposite the arm's outward dir.
      const flip=(p.armdx<0)||(p.armdy<0);
      if(flip){v1=p.outerVal;v2=p.innerVal;} else {v1=p.innerVal;v2=p.outerVal;}
      // wild 12 sits on the inner half; mark whichever displayed slot that is
      if(p.wild){ if(flip)wo=true; else wi=true; }
    }
    const lay=p.lay,body=tileBody(v1,v2,lay,wi,wo);wrap.appendChild(body);
    const w=(lay==='h')?TILE_LONG:TILE_SHORT,h=(lay==='h')?TILE_SHORT:TILE_LONG;
    wrap.style.left=(p.x-w/2)+'px';wrap.style.top=(p.y-h/2)+'px';
    body.querySelectorAll('.half').forEach(hf=>{hf.style.width=HALF+'px';hf.style.height=HALF+'px';});
    layer.appendChild(wrap);
  });
  const myPlays=State.turn==='you'?legalPlays(State.hands.you):[];
  const targetable=new Set(myPlays.filter(p=>State.selected&&p.tile.id===State.selected).map(p=>p.end.eid));
  State.ends.forEach(end=>{
    if(State.footActive&&end.eid!==State.footEndId)return;
    const m=document.createElement('div');m.className='endmark';if(end.foot)m.classList.add('foot');if(targetable.has(end.eid))m.classList.add('live');
    m.style.width=HALF+'px';m.style.height=HALF+'px';m.style.left=(end.x-HALF/2)+'px';m.style.top=(end.y-HALF/2)+'px';
    m.textContent=end.foot?('🦶'+(end.foot.need-end.foot.done)):end.value;
    if(State.turn==='you'&&State.selected!=null){const tile=State.hands.you.find(t=>t.id===State.selected);if(tile&&matchPlan(tile,end))m.addEventListener('click',()=>tryPlace(end));}
    layer.appendChild(m);
  });
  applyView();
}
function applyView(){el('boardLayer').style.transform=`translate(${State.view.x}px,${State.view.y}px) scale(${State.view.scale})`;}
function centerView(){const f=el('felt');State.view.scale=1;State.view.x=f.clientWidth/2;State.view.y=f.clientHeight/2;applyView();}

function render(){
  el('scoreYou').textContent=State.scores.you;el('scoreBot').textContent=State.scores.bot;
  const sd=startDouble(State.roundIndex);el('roundLabel').textContent=`Round ${State.roundIndex+1} · ${sd}-${sd}`;
  const tc=el('turnChip');tc.textContent=State.turn==='you'?'Your turn':"Bot's turn";tc.className='chip '+(State.turn==='you'?'you':'bot');
  el('footChip').style.display=State.footActive?'inline-block':'none';
  el('botTilesChip').textContent=`Bot: ${State.hands.bot.length} tile${State.hands.bot.length===1?'':'s'}`;
  el('boneChip').textContent=`Boneyard: ${State.boneyard.length}`;
  let msg=State.statusOverride;
  if(!msg){if(State.footActive){const fe=State.ends.find(e=>e.eid===State.footEndId);const left=fe?(fe.foot.need-fe.foot.done):0;msg=`Chicken foot: ${left} leg${left===1?'':'s'} left — only that end is playable.`;}
    else if(State.turn==='you')msg='Tap a glowing tile, then a glowing end on the table.';else msg='Bot is thinking…';}
  el('statusMsg').textContent=msg;State.statusOverride=null;
  renderBoard();renderHand();
}
function renderHand(){
  const hand=el('hand');hand.innerHTML='';
  const myPlays=State.turn==='you'?legalPlays(State.hands.you):[];const playable=new Set(myPlays.map(p=>p.tile.id));
  State.hands.you.forEach(tile=>{
    const wrap=document.createElement('div');wrap.className='htile';
    if(isWild(tile))wrap.classList.add('wild');if(playable.has(tile.id))wrap.classList.add('playable');else if(State.turn==='you')wrap.classList.add('dim');if(State.selected===tile.id)wrap.classList.add('selected');
    const body=tileBody(tile.a,tile.b,'h',isWild(tile)&&tile.a===12,isWild(tile)&&tile.b===12);
    body.querySelectorAll('.half').forEach(hf=>{hf.style.width=HALF+'px';hf.style.height=HALF+'px';});wrap.appendChild(body);
    if(State.turn==='you'&&playable.has(tile.id))wrap.addEventListener('click',()=>{
      const ends=myPlays.filter(p=>p.tile.id===tile.id);
      const distinctVals=new Set(ends.map(p=>p.end.value));
      if(State.selected===tile.id){ tryPlace(ends[0].end,tile.id); return; }
      if(ends.length===1 || distinctVals.size===1){ tryPlace(ends[0].end,tile.id); }
      else { State.selected=tile.id; State.statusOverride='Tap a glowing end to place — or tap the tile again to use the first one.'; render(); }
    });
    hand.appendChild(wrap);
  });
  el('handCount').textContent=`${State.hands.you.length} tiles · ${handPips('you')} pips`;
  el('drawBtn').disabled=State.turn!=='you'||myPlays.length>0;
  el('passBtn').disabled=State.turn!=='you'||myPlays.length>0||State.boneyard.length>0;
}
function tryPlace(end,tileId){const id=(tileId!=null)?tileId:State.selected;if(id==null)return;const tile=State.hands.you.find(t=>t.id===id);if(!tile)return;const plan=matchPlan(tile,end);if(!plan){State.statusOverride='That tile can’t go there.';render();return;}log(`You play <b class="me">${tile.a}-${tile.b}</b>${plan.wild?' as a wild':''}.`,true);applyPlay(plan,'you');}
function log(html,me){const l=el('log');const d=document.createElement('div');d.innerHTML=html;if(me)d.classList.add('me');l.appendChild(d);l.scrollTop=l.scrollHeight;}

/* ===================== LEADERBOARD ===================== */
function recordMatch(){
  const youWon=State.scores.you<State.scores.bot;const tie=State.scores.you===State.scores.bot;
  Session.matches.unshift({n:Session.matches.length+1,you:State.scores.you,bot:State.scores.bot,result:tie?'tie':(youWon?'you':'bot')});
  if(tie){Session.youWins+=0;}else if(youWon)Session.youWins++;else Session.botWins++;
  Session.youPips+=State.scores.you;Session.botPips+=State.scores.bot;
  renderLeaderboard();
}
function renderLeaderboard(){
  const table=el('lbTable');
  table.querySelectorAll('.lb-row:not(.head)').forEach(r=>r.remove());
  const empty=el('lbEmpty');
  if(Session.matches.length===0){empty.style.display='block';}
  else{empty.style.display='none';
    Session.matches.forEach((m,i)=>{
      const row=document.createElement('div');row.className='lb-row'+(m.result==='you'?' win':'');
      const res=m.result==='tie'?'<span class="res">Tie</span>':(m.result==='you'?'<span class="res w">You win</span>':'<span class="res l">Bot win</span>');
      row.innerHTML=`<span class="rk">${m.n}</span><span>Match ${m.n}</span>${res}<span>${m.you}–${m.bot}</span>`;
      table.appendChild(row);
    });
  }
  el('tYou').textContent=Session.youWins;el('tBot').textContent=Session.botWins;
  const played=Session.matches.length;
  el('tYouSub').textContent=played?`${Session.youPips} total pips · ${played} played`:'—';
  el('tBotSub').textContent=played?`${Session.botPips} total pips · ${played} played`:'—';
}

/* ===================== PAN/ZOOM ===================== */
(function(){const felt=el('felt');let drag=false,sx,sy,ox,oy;
  felt.addEventListener('mousedown',e=>{if(e.target.closest('.endmark'))return;drag=true;felt.classList.add('dragging');sx=e.clientX;sy=e.clientY;ox=State.view.x;oy=State.view.y;});
  window.addEventListener('mousemove',e=>{if(!drag)return;State.view.x=ox+(e.clientX-sx);State.view.y=oy+(e.clientY-sy);applyView();});
  window.addEventListener('mouseup',()=>{drag=false;felt.classList.remove('dragging');});
  felt.addEventListener('wheel',e=>{e.preventDefault();const f=e.deltaY<0?1.1:0.9;State.view.scale=Math.min(2.2,Math.max(0.4,State.view.scale*f));applyView();},{passive:false});
  let td=false,tsx,tsy,tox,toy;
  felt.addEventListener('touchstart',e=>{if(e.touches.length===1&&!e.target.closest('.endmark')){td=true;tsx=e.touches[0].clientX;tsy=e.touches[0].clientY;tox=State.view.x;toy=State.view.y;}},{passive:true});
  felt.addEventListener('touchmove',e=>{if(td&&e.touches.length===1){State.view.x=tox+(e.touches[0].clientX-tsx);State.view.y=toy+(e.touches[0].clientY-tsy);applyView();}},{passive:true});
  felt.addEventListener('touchend',()=>{td=false;});
  el('zoomIn').onclick=()=>{State.view.scale=Math.min(2.2,State.view.scale*1.15);applyView();};
  el('zoomOut').onclick=()=>{State.view.scale=Math.max(0.4,State.view.scale*0.87);applyView();};
  el('zoomFit').onclick=centerView;
})();
el('drawBtn').onclick=()=>{if(State.turn==='you')drawAndPlay('you');};
el('passBtn').onclick=()=>{if(State.turn==='you')passTurn('you',false);};
el('newGameBtn').onclick=()=>{State.scores={you:0,bot:0};State.roundIndex=0;State.gameOver=false;el('log').innerHTML='';startRound();};

/* ===================== MODALS ===================== */
function showRoundModal(title,winner,pts,blocked,bd){
  const m=el('modal');let b=`<h2>${title}</h2>`;
  if(blocked){b+=`<p>No one could move — both hands counted.</p><div class="scores">
    <div class="row ${bd.py<=bd.pb?'lead':''}"><span>You — pips this round</span><b>+${bd.py}</b></div>
    <div class="row ${bd.pb<bd.py?'lead':''}"><span>Bot — pips this round</span><b>+${bd.pb}</b></div></div>`;}
  else{const w=winner==='you'?'You':'Bot',l=winner==='you'?'Bot':'You';b+=`<p><b>${w}</b> emptied their hand. <b>${l}</b> takes the leftover pips.</p><div class="scores"><div class="row"><span>Pips added to ${l.toLowerCase()}</span><b>+${pts}</b></div></div>`;}
  b+=`<div class="scores"><div class="row ${State.scores.you<=State.scores.bot?'lead':''}"><span>Total — You</span><b>${State.scores.you}</b></div><div class="row ${State.scores.bot<State.scores.you?'lead':''}"><span>Total — Bot</span><b>${State.scores.bot}</b></div></div>`;
  const nl=State.roundIndex+1>=ROUNDS?'See final result':`Next round (${startDouble(State.roundIndex+1)}-${startDouble(State.roundIndex+1)})`;
  b+=`<div class="actions"><button class="btn" id="nextBtn">${nl}</button></div>`;
  m.innerHTML=b;el('overlay').classList.add('show');el('nextBtn').onclick=()=>{el('overlay').classList.remove('show');nextRoundOrEnd();};
}
function showGameOver(){
  State.gameOver=true;recordMatch();
  const m=el('modal');const yw=State.scores.you<State.scores.bot,tie=State.scores.you===State.scores.bot;
  m.innerHTML=`<h2>${tie?'Dead heat':(yw?'You win the match! 🐔':'Bot wins the match')}</h2>
    <p>All 13 rounds played (12-12 down to 0-0). Lowest total wins. Added to the session leaderboard.</p>
    <div class="scores"><div class="row ${yw||tie?'lead':''}"><span>You</span><b>${State.scores.you}</b></div><div class="row ${!yw||tie?'lead':''}"><span>Bot</span><b>${State.scores.bot}</b></div></div>
    <div class="actions"><button class="btn" id="againBtn">Play again</button><button class="btn ghost" id="seeLb">See leaderboard</button></div>`;
  el('overlay').classList.add('show');
  el('againBtn').onclick=()=>{el('overlay').classList.remove('show');State.scores={you:0,bot:0};State.roundIndex=0;State.gameOver=false;el('log').innerHTML='';startRound();};
  el('seeLb').onclick=()=>{el('overlay').classList.remove('show');document.getElementById('leaderboard').scrollIntoView({behavior:'smooth'});};
}

/* ===================== NAV / HERO DECO ===================== */
(function(){
  // scroll spy
  const secs=[...document.querySelectorAll('section')];const links=[...document.querySelectorAll('nav a[data-nav]')];
  window.addEventListener('scroll',()=>{
    const y=window.scrollY+140;let cur=secs[0].id;
    for(const s of secs){if(s.offsetTop<=y)cur=s.id;}
    links.forEach(l=>l.classList.toggle('active',l.getAttribute('href')==='#'+cur));
  });
  // hero decorative dominoes
  function deco(v1,v2,lay,x,y,r){
    const d=document.createElement('div');d.className='deco-dom '+lay+' float';d.style.left=x;d.style.top=y;d.style.setProperty('--r',r+'deg');d.style.transform=`rotate(${r}deg)`;d.style.animationDelay=(Math.random()*2)+'s';
    [v1,v2].forEach((val,i)=>{const half=document.createElement('div');half.className='dh';const g={0:[],1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}[val]||null;
      if(g){for(let k=0;k<9;k++){const c=document.createElement('span');if(g.includes(k))c.className='dp';half.appendChild(c);}}else{const n=document.createElement('span');n.className='dnum';n.textContent=val;half.appendChild(n);}
      d.appendChild(half);if(i===0){const dl=document.createElement('div');dl.className='dv-line';d.appendChild(dl);}});
    return d;
  }
  const art=el('heroArt');if(art){
    art.appendChild(deco(12,12,'v','30%','2%',-8));
    art.appendChild(deco(6,3,'h','2%','42%',6));
    art.appendChild(deco(12,5,'h','46%','58%',-4));
    art.appendChild(deco(9,9,'v','72%','20%',10));
  }
})();

window.addEventListener('resize',applyView);
renderLeaderboard();
startRound();
