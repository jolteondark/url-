const byId=(id)=>document.getElementById(id);
let epoch=0;
let menuFallbackFocused=false;
function visible(n){return !!(n&&!n.hidden&&n.getClientRects().length)}
function enabled(n){return visible(n)&&!n.disabled}
function first(root,sel){return root?[...root.querySelectorAll(sel)].find(enabled)??null:null}
function current(root,sel){const active=document.activeElement;return active instanceof HTMLElement&&root?.contains(active)&&enabled(active)&&active.matches(sel)?active:null}
function runtime(){return globalThis.__maplessSafariRuntime?.variables?.mapless??null}
function normalEventActive(){const active=globalThis.__maplessNormalEventUi??null;return active?.runtime===globalThis.__maplessSafariRuntime}
function stopScroll(){window.scrollTo({top:window.scrollY,left:window.scrollX,behavior:"auto"})}
function commandTarget(battle){
 const mode=battle?.dataset?.dpptMenu;
 if(mode==="fight"){
  const sel='#moves button[data-move-id]:not(:disabled),#dppt-command-back:not(:disabled)';
  return current(battle,sel)??first(battle,sel);
 }
 if(mode==="bag"){
  const sel='#dppt-battle-bag button:not(:disabled),#dppt-command-back:not(:disabled)';
  return current(battle,sel)??first(battle,sel);
 }
 const sel='#dppt-command-root button:not(:disabled)';
 return current(battle,sel)??first(battle,'#dppt-command-root button[data-dppt-command="fight"]:not(:disabled)');
}
function gameMenuTarget(menu,{upgradeFallback=false}={}){
 const sel='button:not(:disabled),select:not(:disabled),input:not(:disabled),[tabindex]:not([tabindex="-1"])';
 const pane=[...menu.querySelectorAll("[data-menu-pane]")].find(visible)??null;
 const paneActive=current(pane,sel);
 if(paneActive){menuFallbackFocused=false;return paneActive;}
 const close=byId("game-menu-close");
 if(!upgradeFallback){
  const active=current(menu,sel);
  if(active){if(active!==close)menuFallbackFocused=false;return active;}
 }
 const paneTarget=first(pane,sel);
 if(paneTarget){menuFallbackFocused=false;return paneTarget;}
 if(enabled(close)){menuFallbackFocused=true;return close;}
 menuFallbackFocused=false;
 return null;
}
function battleFocusAllowed(active,battleCard,currentBattle){
 if(!(active instanceof HTMLElement)||!battleCard?.contains(active)||!currentBattle)return false;
 const phase=currentBattle.phase;
 if(phase==="RESULT")return active===byId("return-board")&&enabled(active);
 if(phase==="REPLACEMENT")return active.matches('.player-replacement-panel button:not(:disabled)')&&enabled(active);
 if(phase!=="COMMAND")return false;
 const mode=battleCard.dataset.dpptMenu;
 if(mode==="fight")return active.matches('#moves button[data-move-id]:not(:disabled),#dppt-command-back:not(:disabled)')&&enabled(active);
 if(mode==="bag")return active.matches('#dppt-battle-bag button:not(:disabled),#dppt-command-back:not(:disabled)')&&enabled(active);
 return active.matches('#dppt-command-root button:not(:disabled)')&&enabled(active);
}
function clearBattleFocusOutsideInteractivePhase(){
 const s=runtime();
 const battleCard=byId("battle-card");
 const active=document.activeElement;
 if(!(active instanceof HTMLElement)||!battleCard?.contains(active))return;
 if(visible(byId("game-menu"))||!battleFocusAllowed(active,battleCard,s?.battle))active.blur();
}
function settle(options={}){
 const upgradeMenuFallback=options?.upgradeMenuFallback===true;
 clearBattleFocusOutsideInteractivePhase();
 const token=++epoch;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(token!==epoch)return;
  const menu=byId("game-menu");
  if(visible(menu)){
   const target=gameMenuTarget(menu,{upgradeFallback:upgradeMenuFallback});
   requestAnimationFrame(()=>{if(token===epoch&&enabled(target))target.focus({preventScroll:true})});
   return;
  }
  menuFallbackFocused=false;
  const s=runtime();
  let target=null,scrollTarget=null,block="nearest";
  const normalEvent=byId("normal-event-card");
  const battle=byId("battle-card");
  if(normalEventActive()&&visible(normalEvent)){
   const sel='button[data-normal-event-action]:not(:disabled)';
   scrollTarget=normalEvent; block="start";
   target=current(normalEvent,sel)??first(normalEvent,sel);
  }else if(s?.battle&&visible(battle)){
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
   target=[byId("bounty-depart"),byId("bounty-accept"),byId("village-shop-select"),byId("leave-village")].find(enabled)
    ??first(village,'button:not(:disabled),select:not(:disabled),input:not(:disabled),[tabindex]:not([tabindex="-1"])');
  }else if(visible(byId("board-card"))){
   const board=byId("board-card"); scrollTarget=board; block="start";
   target=first(board,'.board-cell:not(:disabled):not(.consumed),#enter-village:not(:disabled)');
  }
  stopScroll();
  scrollTarget?.scrollIntoView?.({behavior:"auto",block,inline:"nearest"});
  requestAnimationFrame(()=>{if(token===epoch&&enabled(target))target.focus({preventScroll:true})});
 }))
}
function settleRenderedPane(paneId){
 const menu=byId("game-menu");
 const pane=byId(paneId);
 if(!visible(menu)||!visible(pane))return;
 const close=byId("game-menu-close");
 const upgradeMenuFallback=menuFallbackFocused&&document.activeElement===close;
 settle({upgradeMenuFallback});
}
function settlePartyPanel(){settleRenderedPane("menu-party-pane")}
function settleBagPanel(){settleRenderedPane("menu-bag-pane")}
function settleBoxPanel(){settleRenderedPane("menu-box-pane")}
for(const name of ["safari-runtime-changed","safari-preview-start","safari-game-menu-opened","safari-game-menu-open-failed","safari-game-menu-closed","safari-normal-event-rendered","safari-normal-event-closed","mapless-dppt-menu-changed","pageshow"])window.addEventListener(name,settle,{passive:true});
window.addEventListener("safari-party-panel-rendered",settlePartyPanel,{passive:true});
window.addEventListener("safari-storage-controls-rendered",settleBoxPanel,{passive:true});
window.addEventListener("storage",settleBagPanel,{passive:true});
settle();