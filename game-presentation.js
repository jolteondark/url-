const byId=(id)=>document.getElementById(id);
const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value};
const setStyleWidth=(node,value)=>{if(node&&node.style.width!==value)node.style.width=value};

function eventTone(label=""){
  if(/野生|トレーナー|罠/.test(label))return "danger";
  if(/センター|野宿/.test(label))return "rest";
  if(/ショップ|卵屋|炭鉱夫|交換所|民家|酒場/.test(label))return "facility";
  if(/宝箱|落とし物/.test(label))return "reward";
  if(/タイプイベント|出来事/.test(label))return "event";
  return "unknown";
}

function ensureBoardChrome(){
  const board=byId("board");
  if(!board)return;
  const scene=byId("board-card");
  if(scene&&!scene.querySelector(".board-progress")){
    const bar=document.createElement("div");
    bar.className="board-progress";
    bar.innerHTML='<div><span class="board-progress-label">TODAY</span><strong id="board-progress-text">0 / 8 cleared</strong></div><div class="board-progress-track" aria-hidden="true"><span id="board-progress-fill"></span></div>';
    board.before(bar);
  }
  if(scene&&!scene.querySelector(".board-guidance")){
    const guide=document.createElement("div");
    guide.className="board-guidance";
    guide.innerHTML='<span>ROUTE SELECT</span><p>マスを選んで探索を進める</p>';
    board.before(guide);
  }
}

function decorateBoard(){
  ensureBoardChrome();
  const board=byId("board");
  if(!board)return;
  const cells=[...board.querySelectorAll(".board-cell")];
  let consumed=0;
  let revealed=0;
  for(const [index,cell] of cells.entries()){
    consumed+=cell.classList.contains("consumed")?1:0;
    revealed+=cell.classList.contains("revealed")?1:0;
    cell.dataset.slot=String(index+1);
    const label=cell.querySelector("strong")?.textContent??"";
    cell.dataset.eventTone=cell.classList.contains("revealed")?eventTone(label):"unknown";
    if(!cell.querySelector(".cell-state")){
      const state=document.createElement("span");
      state.className="cell-state";
      cell.append(state);
    }
    if(!cell.querySelector(".cell-glyph")){
      const glyph=document.createElement("span");
      glyph.className="cell-glyph";
      glyph.setAttribute("aria-hidden","true");
      cell.append(glyph);
    }
    const state=cell.querySelector(".cell-state");
    const stateText=cell.classList.contains("consumed")?"CLEARED":cell.classList.contains("revealed")?"REVEALED":"UNKNOWN";
    setText(state,stateText);
    cell.setAttribute("aria-label",`マス ${index+1}: ${label} ${stateText}`);
  }
  setText(byId("board-progress-text"),`${consumed} / ${cells.length||8} cleared · ${revealed} revealed`);
  setStyleWidth(byId("board-progress-fill"),`${cells.length?Math.round(consumed/cells.length*100):0}%`);
}

function hpTone(id){
  const bar=byId(id);
  if(!bar)return;
  const value=Math.max(0,Math.min(100,parseFloat(bar.style.width)||0));
  bar.dataset.hpTone=value<=20?"danger":value<=50?"warn":"safe";
}

function decorateMoves(){
  const moves=byId("moves");
  if(!moves)return;
  [...moves.children].forEach((button,index)=>{
    button.dataset.command=String(index+1);
    if(!button.querySelector(".command-index")){
      const tag=document.createElement("span");
      tag.className="command-index";
      tag.textContent=String(index+1);
      button.prepend(tag);
    }
  });
}

function decorateBattle(){
  hpTone("player-hp-bar");
  hpTone("foe-hp-bar");
  decorateMoves();
  const battle=byId("battle-card");
  if(!battle)return;
  const title=byId("battle-title")?.textContent||"Battle";
  battle.dataset.battleKind=/trainer|bounty/i.test(title)?"trainer":/wild/i.test(title)?"wild":"other";
}

function decorateHud(){
  const hud=document.querySelector(".hud");
  if(!hud)return;
  [...hud.children].forEach((item,index)=>item.dataset.hudSlot=String(index+1));
}

function decorateScenes(){
  for(const scene of document.querySelectorAll(".scene"))scene.classList.toggle("scene-active",!scene.hidden);
  const current=byId("battle-card")&&!byId("battle-card").hidden?"battle":byId("shop-card")&&!byId("shop-card").hidden?"shop":byId("village-card")&&!byId("village-card").hidden?"village":"board";
  document.body.dataset.scene=current;
  document.body.classList.add("presentation-ready");
}

function syncViewport(){
  const height=window.visualViewport?.height??window.innerHeight;
  document.documentElement.style.setProperty("--mapless-vvh",`${height}px`);
}

let queued=false;
function renderPresentation(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
    queued=false;
    decorateBoard();
    decorateBattle();
    decorateHud();
    decorateScenes();
  });
}

syncViewport();
renderPresentation();
window.visualViewport?.addEventListener("resize",syncViewport,{passive:true});
window.addEventListener("orientationchange",syncViewport,{passive:true});
new MutationObserver(renderPresentation).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class","hidden","style","disabled"]});
