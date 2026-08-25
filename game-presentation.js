const byId=(id)=>document.getElementById(id);
const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value};
const setStyleWidth=(node,value)=>{if(node&&node.style.width!==value)node.style.width=value};
let queued=false;

function eventTone(label=""){
  if(/野生|トレーナー|罠/.test(label))return "danger";
  if(/センター|野宿/.test(label))return "rest";
  if(/ショップ|卵屋|炭鉱夫|交換所|民家|酒場/.test(label))return "facility";
  if(/宝箱|落とし物/.test(label))return "reward";
  if(/タイプイベント|出来事/.test(label))return "event";
  return "unknown";
}

function ensureBoardChrome(){
  const board=byId("board");if(!board)return;const scene=byId("board-card");
  if(scene&&!scene.querySelector(".board-progress")){const bar=document.createElement("div");bar.className="board-progress";bar.innerHTML='<div><span class="board-progress-label">TODAY</span><strong id="board-progress-text">0 / 8 cleared</strong></div><div class="board-progress-track" aria-hidden="true"><span id="board-progress-fill"></span></div>';board.before(bar)}
  if(scene&&!scene.querySelector(".board-guidance")){const guide=document.createElement("div");guide.className="board-guidance";guide.innerHTML='<span>ROUTE SELECT</span><p>マスを選んで探索を進める</p>';board.before(guide)}
}

function decorateBoard(){
  ensureBoardChrome();const board=byId("board");if(!board)return;const cells=[...board.querySelectorAll(".board-cell")];let consumed=0,revealed=0;
  for(const [index,cell] of cells.entries()){
    consumed+=cell.classList.contains("consumed")?1:0;revealed+=cell.classList.contains("revealed")?1:0;cell.dataset.slot=String(index+1);
    const label=cell.querySelector("strong")?.textContent??"";cell.dataset.eventTone=cell.classList.contains("revealed")?eventTone(label):"unknown";
    if(!cell.querySelector(".cell-state")){const state=document.createElement("span");state.className="cell-state";cell.append(state)}
    if(!cell.querySelector(".cell-glyph")){const glyph=document.createElement("span");glyph.className="cell-glyph";glyph.setAttribute("aria-hidden","true");cell.append(glyph)}
    const stateText=cell.classList.contains("consumed")?"CLEARED":cell.classList.contains("revealed")?"REVEALED":"UNKNOWN";setText(cell.querySelector(".cell-state"),stateText);
    const aria=`マス ${index+1}: ${label} ${stateText}`;if(cell.getAttribute("aria-label")!==aria)cell.setAttribute("aria-label",aria);
  }
  setText(byId("board-progress-text"),`${consumed} / ${cells.length||8} cleared · ${revealed} revealed`);setStyleWidth(byId("board-progress-fill"),`${cells.length?Math.round(consumed/cells.length*100):0}%`);
}

function decorateHud(){const hud=document.querySelector(".hud");if(!hud)return;[...hud.children].forEach((item,index)=>{const slot=String(index+1);if(item.dataset.hudSlot!==slot)item.dataset.hudSlot=slot})}
function decorateScenes(){for(const scene of document.querySelectorAll(".scene"))scene.classList.toggle("scene-active",!scene.hidden);const current=byId("battle-card")&&!byId("battle-card").hidden?"battle":byId("shop-card")&&!byId("shop-card").hidden?"shop":byId("village-card")&&!byId("village-card").hidden?"village":"board";if(document.body.dataset.scene!==current)document.body.dataset.scene=current;document.body.classList.add("presentation-ready")}
function syncViewport(){const height=window.visualViewport?.height??window.innerHeight;document.documentElement.style.setProperty("--mapless-vvh",`${height}px`)}

function renderPresentation(){queued=false;decorateBoard();decorateHud();decorateScenes()}
function schedulePresentation(){if(queued)return;queued=true;requestAnimationFrame(renderPresentation)}

syncViewport();schedulePresentation();
window.visualViewport?.addEventListener("resize",syncViewport,{passive:true});
window.addEventListener("orientationchange",syncViewport,{passive:true});
window.addEventListener("pageshow",schedulePresentation,{passive:true});
window.addEventListener("safari-runtime-changed",schedulePresentation,{passive:true});
document.addEventListener("click",schedulePresentation,{passive:true});
