const byId=(id)=>document.getElementById(id);
let epoch=0;
function visible(n){return !!(n&&!n.hidden&&n.getClientRects().length)}
function enabled(n){return visible(n)&&!n.disabled}
function first(root,sel){return root?[...root.querySelectorAll(sel)].find(enabled)??null:null}
function runtime(){return globalThis.__maplessSafariRuntime?.variables?.mapless??null}
function stopScroll(){window.scrollTo({top:window.scrollY,left:window.scrollX,behavior:"auto"})}
function commandTarget(battle){
 const mode=battle?.dataset?.dpptMenu;
 if(mode==="fight")return first(battle,'#moves button[data-move-id]:not(:disabled),#dppt-command-back:not(:disabled)');
 if(mode==="bag")return first(battle,'#dppt-battle-bag button:not(:disabled),#dppt-command-back:not(:disabled)');
 return first(battle,'#dppt-command-root button[data-dppt-command="fight"]:not(:disabled)');
}
function clearBattleFocusOutsideInteractivePhase(){
 const s=runtime();
 const battle=byId("battle-card");
 const active=document.activeElement;
 if(!(active instanceof HTMLElement)||!battle?.contains(active))return;
 if(!s?.battle||!["COMMAND","REPLACEMENT","RESULT"].includes(s.battle.phase))active.blur();
}
function settle(){
 clearBattleFocusOutsideInteractivePhase();
 const token=++epoch;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(token!==epoch)return;
  const menu=byId("game-menu");
  if(visible(menu))return;
  const s=runtime();
  let target=null,scrollTarget=null,block="nearest";
  const battle=byId("battle-card");
  if(s?.battle&&visible(battle)){
   const phase=s.battle.phase;
   scrollTarget=battle; block="start";
   if(phase==="COMMAND") target=commandTarget(battle);
   else if(phase==="REPLACEMENT") target=first(battle,'.player-replacement-panel button:not(:disabled)');
   else if(phase==="RESULT") target=enabled(byId("return-board"))?byId("return-board"):null;
  }else if(visible(byId("shop-card"))){
   const shop=byId("shop-card"); scrollTarget=shop; block="start";
   target=first(shop,'.shop-touch-item.selected:not(:disabled),.shop-touch-item:not(:disabled),#shop-quantity:not(:disabled),#shop-confirm:not(:disabled),#shop-cancel:not(:disabled)');
  }else if(visible(byId("village-card"))){
   const village=byId("village-card"); scrollTarget=village; block="start";
   target=[byId("bounty-depart"),byId("bounty-accept"),byId("village-shop-select"),byId("leave-village")].find(enabled)??null;
  }else if(visible(byId("board-card"))){
   const board=byId("board-card"); scrollTarget=board; block="start";
   target=first(board,'.board-cell:not(:disabled):not(.consumed),#enter-village:not(:disabled)');
  }
  stopScroll();
  scrollTarget?.scrollIntoView?.({behavior:"auto",block,inline:"nearest"});
  requestAnimationFrame(()=>{if(token===epoch&&enabled(target))target.focus({preventScroll:true})});
 }))
}
for(const name of ["safari-runtime-changed","safari-preview-start","safari-game-menu-closed","mapless-dppt-menu-changed","pageshow"])window.addEventListener(name,settle,{passive:true});
settle();
