function cloneEvent(source={}){ const event={...source}; event.normal_data={...(source.normal_data||{})}; return event; }
function finish(event,operations,outcome){ event.normal_resolved=true; operations.push({op:'finish_event'}); return {event,operations,result:true,outcome}; }
function unresolved(event,operations,outcome){ return {event,operations,result:false,outcome}; }
function choose(input,type=null,key='chosen_pokemon'){ return {op:'choose_pokemon',type,result:input[key]??null}; }
function resolvedItems(input,min,max,label,key='reward_items'){ const items=input[key]; if(!Array.isArray(items)||items.length<min||items.length>max) throw new Error(`${label} requires ${min}-${max} resolved reward item(s)`); return [...items]; }
function battle(type,modifier,seed,extra={}){ return {op:'start_wild_battle',type,modifier,seed,...extra}; }

export function resolveMeteorFragment(input={}){
 const event=cloneEvent(input.event), data=event.normal_data, ops=[], actions=[];
 if(input.has_rock) actions.push('rock'); if(input.has_steel) actions.push('steel'); actions.push('smash','carry','leave');
 ops.push({op:'present_choices',event_id:'meteor_fragment',actions}); const action=input.action;
 if(!actions.includes(action)) return unresolved(event,ops,'cancelled');
 if(action==='leave'){ ops.push({op:'leave_event'}); return finish(event,ops,'left'); }
 if(action==='rock'){
   const p=input.chosen_pokemon; ops.push(choose(input,'ROCK')); if(!p) return unresolved(event,ops,'pokemon_cancelled');
   const choices=(data.rock_choices||[]); const item=input.rock_choice; if(!item||!choices.includes(item)) return unresolved(event,ops,'item_cancelled');
   ops.push({op:'grant_items',items:[item]}); return finish(event,ops,'rock_reward');
 }
 if(action==='steel'){
   const p=input.chosen_pokemon; ops.push(choose(input,'STEEL')); if(!p) return unresolved(event,ops,'pokemon_cancelled');
   ops.push({op:'grant_items',items:resolvedItems(input,2,3,'meteor_fragment steel')}); return finish(event,ops,'steel_reward');
 }
 if(action==='carry'){ ops.push({op:'grant_items',items:resolvedItems(input,1,1,'meteor_fragment carry')}); return finish(event,ops,'carry_reward'); }
 const roll=Number(data.smash_roll); if(!Number.isFinite(roll)) throw new Error('meteor_fragment smash_roll unresolved'); ops.push({op:'smash_roll',value:roll});
 if(roll<55){ ops.push({op:'grant_items',items:resolvedItems(input,1,1,'meteor_fragment smash stone')}); return finish(event,ops,'smash_stone'); }
 if(roll<80){ ops.push({op:'grant_items',items:resolvedItems(input,1,1,'meteor_fragment smash star')}); return finish(event,ops,'smash_star'); }
 if(roll<90){ ops.push({op:'grant_random',tier:'large',quantity:1}); return finish(event,ops,'smash_large'); }
 ops.push({op:'damage_party',amount:15}); return finish(event,ops,'smash_blast');
}

export function resolveHoneyTree(input={}){
 const event=cloneEvent(input.event), data=event.normal_data, ops=[], actions=[];
 if(input.has_bug) actions.push('bug'); actions.push('shake','bark','leave'); ops.push({op:'present_choices',event_id:'honey_tree',actions}); const action=input.action;
 if(!actions.includes(action)) return unresolved(event,ops,'cancelled'); if(action==='leave'){ ops.push({op:'leave_event'}); return finish(event,ops,'left'); }
 if(action==='bug'){
   ops.push(choose(input,'BUG')); if(!input.chosen_pokemon) return unresolved(event,ops,'pokemon_cancelled');
   if(input.honey_exists!==false) ops.push({op:'grant_items',items:Array(input.honey_count??2).fill('HONEY')}); else ops.push({op:'grant_random',tier:'small',quantity:2});
   return finish(event,ops,'bug_safe_reward');
 }
 if(action==='shake'){
   const roll=Number(data.shake_roll); if(!Number.isFinite(roll)) throw new Error('honey_tree shake_roll unresolved'); ops.push({op:'shake_roll',value:roll});
   if(roll<90){ const modifier=roll<65?1:0, seed=(input.event?.normal_seed??0)+(roll<65?0:1); ops.push(battle('BUG',modifier,seed)); if(input.battle_success&&input.honey_exists!==false) ops.push({op:'grant_items',items:['HONEY']}); return finish(event,ops,roll<65?'shake_guard':'shake_startled'); }
   return finish(event,ops,'shake_empty');
 }
 const roll=Number(data.bark_roll); if(!Number.isFinite(roll)) throw new Error('honey_tree bark_roll unresolved'); ops.push({op:'bark_roll',value:roll});
 if(roll<50){ ops.push({op:'grant_items',items:resolvedItems(input,1,1,'honey_tree bark berry')}); return finish(event,ops,'bark_berry'); }
 if(roll<75){ ops.push({op:'grant_random',tier:'small',quantity:1}); return finish(event,ops,'bark_small'); }
 return finish(event,ops,'bark_empty');
}

export function resolveLostPokemon(input={}){
 const event=cloneEvent(input.event), data=event.normal_data, ops=[], actions=['berry','join','search','leave']; ops.push({op:'present_choices',event_id:'lost_pokemon',actions}); const action=input.action;
 if(!actions.includes(action)) return unresolved(event,ops,'cancelled'); if(action==='leave'){ ops.push({op:'leave_event'}); return finish(event,ops,'left'); }
 if(action==='berry'){
   const berry=input.berry; ops.push({op:'choose_item',kind:'berry',result:berry??null}); if(!berry) return unresolved(event,ops,'berry_cancelled');
   ops.push({op:'remove_item',item:berry,quantity:1}); if(input.remove_success===false) return unresolved(event,ops,'berry_remove_failed');
   if(input.rare_thanks){ ops.push({op:'grant_items',items:resolvedItems(input,1,1,'lost_pokemon rare berry','rare_reward_items')}); return finish(event,ops,'berry_rare_reward'); }
   ops.push({op:'grant_random',tier:'small',quantity:1}); return finish(event,ops,'berry_small_reward');
 }
 if(action==='join'){
   const roll=Number(data.join_roll); if(!Number.isFinite(roll)) throw new Error('lost_pokemon join_roll unresolved'); ops.push({op:'join_roll',value:roll});
   if(roll<20){ ops.push({op:'add_unevolved_pokemon',type:data.type,seed:input.event?.normal_seed??0}); return finish(event,ops,input.add_success===false?'join_no_capacity':'joined'); }
   return finish(event,ops,'join_refused');
 }
 const roll=Number(data.search_roll); if(!Number.isFinite(roll)) throw new Error('lost_pokemon search_roll unresolved'); ops.push({op:'search_roll',value:roll});
 if(roll<55){ ops.push({op:'grant_random',tier:'medium',quantity:1}); return finish(event,ops,'search_trainer_reward'); }
 if(roll<80) return finish(event,ops,'search_parent');
 ops.push(battle(data.type,1,input.event?.normal_seed??0)); return finish(event,ops,'search_battle');
}

export function resolveSleepingGiant(input={}){
 const event=cloneEvent(input.event), data=event.normal_data, ops=[], actions=['steal','fight','leave']; ops.push({op:'present_choices',event_id:'sleeping_giant',actions}); const action=input.action;
 if(!actions.includes(action)) return unresolved(event,ops,'cancelled'); if(action==='leave'){ ops.push({op:'leave_event'}); return finish(event,ops,'left'); }
 const item=data.display_item; const battleOp=battle(data.type,3,input.event?.normal_seed??0,{enemy_stages:{[data.boost_stat]:1}});
 if(action==='steal'){
   const roll=Number(data.steal_roll); if(!Number.isFinite(roll)) throw new Error('sleeping_giant steal_roll unresolved'); ops.push({op:'steal_roll',value:roll});
   if(roll<65){ ops.push({op:'grant_items',items:[item]}); return finish(event,ops,'steal_success'); }
   ops.push(battleOp); if(input.battle_success) ops.push({op:'grant_items',items:[item]}); return finish(event,ops,input.battle_success?'steal_battle_win':'steal_battle_no_reward');
 }
 ops.push(battleOp); if(input.battle_success) ops.push({op:'grant_items',items:[item]}); return finish(event,ops,input.battle_success?'fight_win':'fight_no_reward');
}
