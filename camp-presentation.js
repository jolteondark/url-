import { applySafariBoundaryTrialEntry, applySafariCampRecovery, prepareSafariCampNextDay } from "./runtime/safari-camp-next-day-command.js";
import { activateSafariDayBoardCell, saveSafariPlayableRun } from "./runtime/safari-web-playable-integration.js";

const style = document.createElement("style");
style.textContent = `
.camp-backdrop{position:fixed;inset:0;z-index:80;background:rgba(3,8,13,.82);backdrop-filter:blur(10px);display:grid;align-items:end;padding:18px max(18px,env(safe-area-inset-right)) calc(18px + env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left))}.camp-backdrop[hidden]{display:none}.camp-sheet{width:min(100%,560px);margin:0 auto;border:1px solid rgba(255,255,255,.18);border-radius:28px;background:linear-gradient(180deg,#162330,#09131d);box-shadow:0 24px 70px rgba(0,0,0,.55);padding:24px}.camp-kicker{font-size:12px;letter-spacing:.2em;color:#9db3c6}.camp-title{font-size:30px;margin:5px 0 6px}.camp-copy{margin:0 0 18px;color:#c9d5df;line-height:1.6}.camp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.camp-stat{padding:14px;border-radius:18px;background:rgba(255,255,255,.07)}.camp-stat span{display:block;font-size:11px;color:#9fb0bf}.camp-stat strong{display:block;font-size:20px;margin-top:3px}.camp-watcher{padding:14px 16px;border-radius:18px;background:rgba(255,191,94,.1);margin-bottom:16px}.camp-watcher small{display:block;color:#d5b77f}.camp-watcher strong{font-size:18px}.camp-actions{display:grid;grid-template-columns:1fr 1.6fr;gap:10px}.camp-actions button{min-height:56px;border-radius:18px;font-weight:800;font-size:16px}.camp-night{position:fixed;inset:0;z-index:79;display:grid;place-items:center;pointer-events:none;background:radial-gradient(circle at 50% 42%,rgba(55,91,130,.35),rgba(3,7,12,.94));opacity:0;transition:opacity .25s}.camp-night.show{opacity:1}.camp-night strong{font-size:clamp(34px,11vw,58px);letter-spacing:.08em}.camp-night span{display:block;text-align:center;color:#b8c8d7;margin-top:8px}@media(min-width:700px){.camp-backdrop{align-items:center}}`;
document.head.append(style);

const backdrop = document.createElement("div");
backdrop.className = "camp-backdrop";
backdrop.hidden = true;
backdrop.innerHTML = `<section class="camp-sheet" role="dialog" aria-modal="true" aria-labelledby="camp-title"><span class="camp-kicker">CAMP / NEXT DAY</span><h2 class="camp-title" id="camp-title">野営して夜を越す</h2><p class="camp-copy">見張りを立てて休息し、次の日の Day Board へ進みます。</p><div class="camp-watcher"><small>WATCH</small><strong id="camp-watcher">-</strong></div><div class="camp-grid"><div class="camp-stat"><span>PARTY HP</span><strong id="camp-hp">+20%</strong></div><div class="camp-stat"><span>PARTY PP</span><strong id="camp-pp">+10%</strong></div></div><div class="camp-actions"><button type="button" id="camp-cancel">戻る</button><button type="button" id="camp-confirm">休んで次の日へ</button></div></section>`;
document.body.append(backdrop);
const night = document.createElement("div");
night.className = "camp-night";
night.innerHTML = `<div><strong id="camp-day-change">DAY</strong><span id="camp-recovery-note">休息しました</span></div>`;
document.body.append(night);

let pendingButton = null;
const byId = (id) => document.getElementById(id);
function runtime(){return globalThis.__maplessSafariRuntime ?? null;}
function pokemonId(p,index){return p?.personal_id ?? p?.id ?? p?.uuid ?? index;}
function pokemonLabel(p,index){return p?.name ?? p?.species_name ?? p?.species ?? `Pokemon ${index+1}`;}
function boardEventForButton(button){
  const index=Number(button?.dataset?.boardIndex);
  if(!Number.isInteger(index)) return null;
  return runtime()?.variables?.mapless?.board_events?.[index] ?? null;
}

function openCamp(button,index){
  const rt=runtime(); if(!rt) return;
  const owner=prepareSafariCampNextDay(rt,index,false);
  const watcherIndex=(rt.player?.party??[]).findIndex((p,i)=>pokemonId(p,i)===owner.watcher_id);
  const watcher=watcherIndex>=0?rt.player.party[watcherIndex]:null;
  byId("camp-watcher").textContent=watcher?pokemonLabel(watcher,watcherIndex):"見張りなし";
  byId("camp-hp").textContent=`+${owner.normal_recovery.hp_percent}%`;
  byId("camp-pp").textContent=`+${owner.normal_recovery.pp_percent}%`;
  pendingButton=button; pendingButton.dataset.campIndex=String(index); backdrop.hidden=false;
  byId("camp-confirm").focus();
}

export function openSafariCamp(button,index){
  openCamp(button,index);
}

document.addEventListener("click",(event)=>{
  const button=event.target.closest("#board button[data-board-index]");
  if(!button || boardEventForButton(button)?.kind!=="next_day") return;
  event.stopPropagation();
  openCamp(button,Number(button.dataset.boardIndex));
},{capture:true});

byId("camp-cancel").addEventListener("click",()=>{backdrop.hidden=true;pendingButton=null;});
byId("camp-confirm").addEventListener("click",async()=>{
  const button=pendingButton; if(!button) return;
  const rt=runtime(); const index=Number(button.dataset.campIndex); const before=rt.variables.mapless.day;
  const owner=prepareSafariCampNextDay(rt,index,true);
  applySafariCampRecovery(rt,owner);
  const boundaryEntry=applySafariBoundaryTrialEntry(rt,owner);
  backdrop.hidden=true; pendingButton=null;
  if(!boundaryEntry.entered){
    await activateSafariDayBoardCell(rt,index);
  }
  window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  queueMicrotask(()=>{
    try{saveSafariPlayableRun(window.localStorage,rt);}catch(_){}
    byId("camp-day-change").textContent=`DAY ${before} → ${rt.variables.mapless.day}`;
    const extra=owner.fire_watcher?"ほのおタイプの見張りで回復量アップ":"見張り役は回復量が半分";
    byId("camp-recovery-note").textContent=boundaryEntry.entered
      ? `HP +${owner.normal_recovery.hp_percent}% / PP +${owner.normal_recovery.pp_percent}% ・ 境界の試練`
      : `HP +${owner.normal_recovery.hp_percent}% / PP +${owner.normal_recovery.pp_percent}% ・ ${extra}`;
    night.classList.add("show"); window.setTimeout(()=>night.classList.remove("show"),900);
  });
});
