import { SAFARI_MOVE_LABELS, SAFARI_SHOP_ITEM_MASTERS } from "./runtime/safari-playable-data.js";

const byId=(id)=>document.getElementById(id);
let scheduled=false;

function partyCount(){
  const text=byId("party")?.textContent??"0 / 6";
  const match=text.match(/(\d+)/);
  return match?Math.max(0,Math.min(6,Number(match[1]))):0;
}

function trainerName(){
  const card=byId("battle-card");
  if(!card)return null;
  if(card.dataset.ownerName)return card.dataset.ownerName;
  const title=byId("battle-title")?.textContent??"";
  if(/Bounty/i.test(title))return "討伐対象";
  if(!/Trainer/i.test(title))return null;
  const notice=byId("notice")?.textContent?.trim()??"";
  const match=notice.match(/^(.+?)が勝負を仕掛けてきた[！!]?$/);
  if(match){card.dataset.ownerName=match[1];return match[1]}
  return "トレーナー";
}

function pips(count,limit=6){
  const fragment=document.createDocumentFragment();
  for(let index=0;index<limit;index+=1){
    const pip=document.createElement("span");
    pip.className="roster-pip"+(index<count?" active":"");
    fragment.append(pip);
  }
  return fragment;
}

function ensureBattleChrome(){
  const card=byId("battle-card");
  if(!card)return;
  let context=card.querySelector(".battle-context-bar");
  if(!context){
    context=document.createElement("div");
    context.className="battle-context-bar";
    context.innerHTML='<div class="battle-owner"><span id="battle-owner-kicker">ENCOUNTER</span><strong id="battle-owner-name">野生ポケモン</strong></div><div class="battle-roster"><div><small>YOU</small><span id="player-roster-pips" class="roster-pips"></span></div><div><small>FOE</small><span id="foe-roster-pips" class="roster-pips"></span></div></div>';
    card.querySelector(".battle-topline")?.insertAdjacentElement("afterend",context);
  }
  let command=card.querySelector(".battle-command-heading");
  if(!command){
    command=document.createElement("div");
    command.className="battle-command-heading";
    command.innerHTML='<span>COMMAND</span><strong>FIGHT</strong>';
    card.querySelector(".battle-message")?.insertAdjacentElement("beforebegin",command);
  }
}

function renderBattleChrome(){
  const card=byId("battle-card");
  if(!card||card.hidden)return;
  ensureBattleChrome();
  const title=byId("battle-title")?.textContent??"";
  const trainer=trainerName();
  const owner=byId("battle-owner-name");
  const kicker=byId("battle-owner-kicker");
  if(/Trainer|Bounty/i.test(title)){
    if(owner)owner.textContent=trainer??"トレーナー";
    if(kicker)kicker.textContent=/Bounty/i.test(title)?"BOUNTY":"TRAINER";
  }else{
    if(owner)owner.textContent="野生ポケモン";
    if(kicker)kicker.textContent="WILD";
    delete card.dataset.ownerName;
  }
  const playerPips=byId("player-roster-pips");
  const foePips=byId("foe-roster-pips");
  if(playerPips)playerPips.replaceChildren(pips(partyCount()));
  if(foePips)foePips.replaceChildren(pips(1));
  const completed=/Result/i.test(byId("turn")?.textContent??"");
  card.classList.toggle("battle-complete",completed);
}

function decorateParty(){
  document.querySelectorAll("#party-detail-grid .party-slot:not(.empty)").forEach((slot,index)=>{
    slot.dataset.partyIndex=String(index+1);
    const hp=slot.querySelector(".hp-track span");
    const value=Math.max(0,Math.min(100,parseFloat(hp?.style.width)||0));
    slot.dataset.hpTone=value<=20?"danger":value<=50?"warn":"safe";
    slot.querySelectorAll(".party-moves li span:first-child").forEach((node)=>{
      const id=node.dataset.moveId||node.textContent?.trim()||"";
      if(!id)return;
      node.dataset.moveId=id;
      const label=SAFARI_MOVE_LABELS[id];
      if(label){node.textContent=label;node.title=id}
    });
  });
}

function decorateBag(){
  document.querySelectorAll("#menu-bag-pane .bag-slot").forEach((slot)=>{
    const strong=slot.querySelector("strong");
    if(!strong)return;
    const id=slot.dataset.itemId||strong.textContent?.trim()||"";
    if(!id)return;
    slot.dataset.itemId=id;
    const master=SAFARI_SHOP_ITEM_MASTERS[id];
    if(master){strong.textContent=master.label;strong.title=id}
    let meta=slot.querySelector(".bag-item-meta");
    if(!meta){meta=document.createElement("small");meta.className="bag-item-meta";strong.insertAdjacentElement("afterend",meta)}
    meta.textContent=master?.pocket??"ITEM";
  });
}

function render(){
  scheduled=false;
  renderBattleChrome();
  decorateParty();
  decorateBag();
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(render)}

ensureBattleChrome();
render();
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["hidden","style","class"]});
window.addEventListener("pageshow",schedule);
window.addEventListener("storage",schedule);
window.addEventListener("safari-runtime-changed",schedule);
window.addEventListener("safari-game-menu-opened",schedule);
