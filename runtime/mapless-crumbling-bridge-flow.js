function result(event, operations, resolved, outcome, damage={}) {
  return { event, operations, result: resolved, outcome, damage, money_delta: operations.filter(x=>x.op==='add_money').reduce((a,x)=>a+x.amount,0), reward_granted: operations.some(x=>x.op==='open_treasure_chest'||x.op==='grant_random') };
}
function finish(event, operations, outcome, damage={}) { event.normal_resolved=true; operations.push({op:'finish_event'}); return result(event,operations,true,outcome,damage); }
function reward(event, operations, input) {
  const data=event.normal_data||{};
  if(data.reward_kind==='treasure') operations.push({op:'open_treasure_chest',kind:'normal',day:Number(input.current_day||0),seed:Number(event.normal_seed||0),source_name:'橋の向こうの宝箱',result:input.chest_result!==false});
  else { const amount=800+Number(input.scaling_value||0)*120; operations.push({op:'add_money',amount,result:input.money_result!==false},{op:'grant_random',tier:'medium',quantity:1,result:input.random_reward_result!==false}); }
}
export function resolveCrumblingBridge(input={}) {
  const event={...(input.event||{})}; event.normal_data={...((input.event||{}).normal_data||{})}; const operations=[]; const data=event.normal_data;
  const available=[]; if(input.has_flying)available.push('safe_flying'); if(input.has_psychic)available.push('safe_psychic'); available.push('careful','leave'); operations.push({op:'present_bridge_choices',actions:available});
  const action=input.action;
  if(!available.includes(action)) return result(event,operations,false,'cancelled');
  if(action==='leave'){operations.push({op:'leave_event'});return finish(event,operations,'left');}
  if(action==='safe_flying'||action==='safe_psychic'){
    const type=action==='safe_flying'?'FLYING':'PSYCHIC'; operations.push({op:'choose_pokemon',type,result:input.chosen_pokemon||null}); if(!input.chosen_pokemon)return result(event,operations,false,'pokemon_cancelled'); reward(event,operations,input); return finish(event,operations,'safe_reward');
  }
  const roll=Number(data.careful_roll||0); operations.push({op:'careful_roll',value:roll});
  if(roll<60){reward(event,operations,input);return finish(event,operations,'careful_safe');}
  if(roll<90){operations.push({op:'damage_pokemon',target:'active_party_0',amount:20,result:input.damage_result!==false});reward(event,operations,input);return finish(event,operations,'careful_injured',{lead:20,party:0});}
  operations.push({op:'damage_party',amount:10,result:input.damage_result!==false}); return finish(event,operations,'bridge_collapsed',{lead:0,party:10});
}
