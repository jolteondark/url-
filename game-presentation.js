const byId=(id)=>document.getElementById(id);

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
    if(!cell.querySelector(".cell-state")){
      const state=document.createElement("span");
      state.className="cell-state";
      cell.append(state);
    }
    const state=cell.querySelector(".cell-state");
    state.textContent=cell.classList.contains("consumed")?"CLEARED":cell.classList.contains("revealed")?"REVEALED":"UNKNOWN";
    cell.setAttribute("aria-label",`マス ${index+1}: ${cell.querySelector("strong")?.textContent??""} ${state.textContent}`);
  }
  const text=byId("board-progress-text");
  const fill=byId("board-progress-fill");
  if(text)text.textContent=`${consumed} / ${cells.length||8} cleared · ${revealed} revealed`;
  if(fill)fill.style.width=`${cells.length?Math.round(consumed/cells.length*100):0}%`;
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
  battle.dataset.battleKind=/trainer/i.test(title)?"trainer":/wild/i.test(title)?"wild":"other";
}

function decorateScenes(){
  for(const scene of document.querySelectorAll(".scene")){
    scene.classList.toggle("scene-active",!scene.hidden);
  }
  document.body.dataset.scene=byId("battle-card")&&!byId("battle-card").hidden?"battle":byId("shop-card")&&!byId("shop-card").hidden?"shop":byId("village-card")&&!byId("village-card").hidden?"village":"board";
}

let queued=false;
function renderPresentation(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
    queued=false;
    decorateBoard();
    decorateBattle();
    decorateScenes();
  });
}

renderPresentation();
new MutationObserver(renderPresentation).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class","hidden","style","disabled"]});
