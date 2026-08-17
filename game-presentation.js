const byId=(id)=>document.getElementById(id);
const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value};
const setStyleWidth=(node,value)=>{if(node&&node.style.width!==value)node.style.width=value};
let pendingBoardPresentation=null;
let queued=false;

function eventTone(label=""){
  if(/野生|トレーナー|罠/.test(label))return "danger";
  if(/センター|野宿/.test(label))return "rest";
  if(/ショップ|卵屋|炭鉱夫|交換所|民家|酒場/.test(label))return "facility";
  if(/宝箱|落とし物/.test(label))return "reward";
  if(/タイプイベント|出来事/.test(label))return "event";
  return "unknown";
}

function ensureEventScene(){
  if(byId("event-card"))return byId("event-card");
  const stage=document.querySelector(".game-stage");
  if(!stage)return null;
  const scene=document.createElement("section");
  scene.className="scene event-scene";scene.id="event-card";scene.hidden=true;
  scene.innerHTML='<div class="event-visual" aria-hidden="true"><span class="event-orbit"></span><span class="event-sigil">◆</span></div><div class="scene-heading event-heading"><div><span class="scene-kicker" id="event-kicker">ENCOUNTER</span><h2 id="event-title">出来事</h2></div><span class="mode-pill" id="event-result">完了</span></div><p class="event-message" id="event-message"></p><div class="event-footer"><span id="event-day">DAY</span><button id="event-continue" type="button">探索を続ける</button></div>';
  stage.append(scene);byId("event-continue")?.addEventListener("click",()=>hideEventScene(true));return scene;
}

function hideEventScene(focusBoard=false){
  const scene=byId("event-card");if(scene)scene.hidden=true;
  const board=byId("board-card");if(board&&byId("village-card")?.hidden!==false)board.hidden=false;
  pendingBoardPresentation=null;schedulePresentation();
  if(focusBoard)window.setTimeout(()=>board?.scrollIntoView({behavior:"smooth",block:"start"}),0);
}

function eventKickerForTone(tone){return tone==="rest"?"RECOVERY":tone==="facility"?"FACILITY":tone==="reward"?"REWARD":tone==="danger"?"DANGER":tone==="event"?"EVENT":"ENCOUNTER"}

function showEventScene(snapshot){
  const scene=ensureEventScene(),board=byId("board-card");if(!scene||!board)return;
  const currentCell=byId("board")?.querySelector(`button[data-board-index="${snapshot.index}"]`);
  const dayAfter=byId("day")?.textContent??snapshot.day,dayAdvanced=dayAfter!==snapshot.day;
  const currentLabel=currentCell?.querySelector("strong")?.textContent?.trim();
  const title=dayAdvanced?"野宿する":currentLabel&&currentLabel!=="？？？"?currentLabel:snapshot.label&&snapshot.label!=="？？？"?snapshot.label:"出来事";
  const tone=dayAdvanced?"rest":eventTone(title);scene.dataset.eventTone=tone;
  setText(byId("event-kicker"),eventKickerForTone(tone));setText(byId("event-title"),title);setText(byId("event-result"),dayAdvanced?`DAY ${dayAfter}`:"完了");
  setText(byId("event-message"),byId("notice")?.textContent?.trim()||"探索を進めました。");setText(byId("event-day"),`DAY ${dayAfter} · SLOT ${snapshot.index+1}`);
  board.hidden=true;scene.hidden=false;schedulePresentation();window.setTimeout(()=>scene.scrollIntoView({behavior:"smooth",block:"start"}),0);
}

function wireBoardPresentation(){
  const board=byId("board");if(!board||board.dataset.presentationWired==="true")return;
  board.dataset.presentationWired="true";
  board.addEventListener("click",(event)=>{
    const button=event.target.closest("button[data-board-index]");if(!button||button.disabled)return;
    pendingBoardPresentation={index:Number(button.dataset.boardIndex),label:button.querySelector("strong")?.textContent?.trim()??"",day:byId("day")?.textContent??""};
    queueMicrotask(()=>{const snapshot=pendingBoardPresentation;if(!snapshot)return;const boardEvent=globalThis.__maplessSafariRuntime?.variables?.mapless?.board_events?.[snapshot.index];if(boardEvent?.kind==="wild"||boardEvent?.kind==="trainer"){pendingBoardPresentation=null;return}if(byId("battle-card")?.hidden===false||byId("shop-card")?.hidden===false||byId("village-card")?.hidden===false){pendingBoardPresentation=null;return}showEventScene(snapshot)});
  },true);
  byId("new-run")?.addEventListener("click",()=>hideEventScene(false),true);byId("continue-run")?.addEventListener("click",()=>hideEventScene(false),true);
}

function ensureBoardChrome(){
  const board=byId("board");if(!board)return;const scene=byId("board-card");
  if(scene&&!scene.querySelector(".board-progress")){const bar=document.createElement("div");bar.className="board-progress";bar.innerHTML='<div><span class="board-progress-label">TODAY</span><strong id="board-progress-text">0 / 8 cleared</strong></div><div class="board-progress-track" aria-hidden="true"><span id="board-progress-fill"></span></div>';board.before(bar)}
  if(scene&&!scene.querySelector(".board-guidance")){const guide=document.createElement("div");guide.className="board-guidance";guide.innerHTML='<span>ROUTE SELECT</span><p>マスを選んで探索を進める</p>';board.before(guide)}
  wireBoardPresentation();
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
function decorateScenes(){for(const scene of document.querySelectorAll(".scene"))scene.classList.toggle("scene-active",!scene.hidden);const current=byId("battle-card")&&!byId("battle-card").hidden?"battle":byId("shop-card")&&!byId("shop-card").hidden?"shop":byId("village-card")&&!byId("village-card").hidden?"village":byId("event-card")&&!byId("event-card").hidden?"event":"board";if(document.body.dataset.scene!==current)document.body.dataset.scene=current;document.body.classList.add("presentation-ready")}
function syncViewport(){const height=window.visualViewport?.height??window.innerHeight;document.documentElement.style.setProperty("--mapless-vvh",`${height}px`)}

function renderPresentation(){queued=false;decorateBoard();decorateHud();decorateScenes()}
function schedulePresentation(){if(queued)return;queued=true;requestAnimationFrame(renderPresentation)}

syncViewport();ensureEventScene();schedulePresentation();
window.visualViewport?.addEventListener("resize",syncViewport,{passive:true});
window.addEventListener("orientationchange",syncViewport,{passive:true});
window.addEventListener("pageshow",schedulePresentation,{passive:true});
window.addEventListener("safari-runtime-changed",schedulePresentation,{passive:true});
document.addEventListener("click",schedulePresentation,{passive:true});
