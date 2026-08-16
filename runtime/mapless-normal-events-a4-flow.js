function cloneEvent(source={}){ const event={...source}; event.normal_data={...(source.normal_data||{})}; return event; }
function finish(event,ops,outcome){ event.normal_resolved=true; ops.push({op:'finish_event'}); return {event,operations:ops,result:true,outcome}; }
function unresolved(event,ops,outcome){ return {event,operations:ops,result:false,outcome}; }

export function resolveStreetPerformer(input={}){
  const event=cloneEvent(input.event), data=event.normal_data, ops=[];
  const actions=['perform','watch','callout','leave'];
  ops.push({op:'present_choices',event_id:'street_performer',actions});
  const action=input.action;
  if(!actions.includes(action)) return unresolved(event,ops,'cancelled');
  if(action==='leave'){ ops.push({op:'leave_event'}); return finish(event,ops,'left'); }
  const scaling=Number(input.scaling_value||0), day=Number(input.current_day||0);
  if(action==='perform'){
    const pokemon=input.chosen_pokemon??null;
    ops.push({op:'choose_pokemon',type:null,result:pokemon});
    if(!pokemon) return unresolved(event,ops,'pokemon_cancelled');
    const types=Array.isArray(input.pokemon_types)?input.pokemon_types:[];
    if(types.length<1) throw new Error('street_performer pokemon_types unresolved');
    let usedType=types[0];
    if(types.length>1){
      usedType=input.used_type??null;
      ops.push({op:'choose_performance_type',choices:types,result:usedType});
      if(!usedType || !types.includes(usedType)) return unresolved(event,ops,'type_cancelled');
    }
    const sameMove=!!input.same_type_move;
    let prize=700+scaling*120;
    if(sameMove) prize=Math.trunc(prize*1.5);
    ops.push({op:'add_money',amount:prize});
    ops.push({op:'gain_small_exp',target:pokemon,amount:35+day*6});
    if(sameMove) ops.push({op:'grant_random',tier:'small',quantity:1});
    return finish(event,ops,sameMove?'performance_type_move_bonus':'performance');
  }
  if(action==='watch'){
    const price=300+scaling*30;
    ops.push({op:'spend_money',amount:price,success:input.spend_success!==false});
    if(input.spend_success===false) return unresolved(event,ops,'insufficient_money');
    ops.push({op:'heal_party_percent',amount:10,revive:false});
    ops.push({op:'set_exp_show'});
    return finish(event,ops,'watched_show');
  }
  const roll=Number(data.fraud_roll);
  if(!Number.isFinite(roll)) throw new Error('street_performer fraud_roll unresolved');
  ops.push({op:'fraud_roll',value:roll});
  if(roll<35) ops.push({op:'start_trainer_battle',modifier:0,seed:event.normal_seed??0});
  return finish(event,ops,roll<35?'fraud_battle':'false_accusation');
}

export function resolveBountyPoster(input={}){
  const event=cloneEvent(input.event), data=event.normal_data, ops=[];
  const actions=['accept','decline'];
  ops.push({op:'present_choices',event_id:'bounty_poster',actions});
  const action=input.action;
  if(!actions.includes(action)) return unresolved(event,ops,'cancelled');
  if(action==='accept'){
    if(input.existing_bounty){ ops.push({op:'bounty_already_active'}); return finish(event,ops,'already_active'); }
    const bounty={accepted_day:Number(input.current_day||0),target_id:data.trainer_seed,type:data.type,reward:Number(data.reward||0),seed:data.trainer_seed,placed_day:null};
    ops.push({op:'set_bounty',value:bounty});
    return finish(event,ops,'accepted');
  }
  return finish(event,ops,'declined');
}

export function resolveBountyTarget(input={}){
  const event=cloneEvent(input.event), data=event.normal_data, ops=[];
  ops.push({op:'start_trainer_battle',modifier:2,extra_pokemon:true,cannot_run:true,type:data.type,strong_ai:true,seed:data.seed});
  if(Number(input.battle_outcome)===1){
    ops.push({op:'add_money',amount:Number(data.reward||0)});
    ops.push({op:'grant_random',tier:'large',quantity:1});
    const held=Array.isArray(input.held_items)?input.held_items.filter(Boolean):[];
    if(held.length>0){
      const roll=Number(input.held_drop_roll);
      if(!Number.isFinite(roll)) throw new Error('bounty_target held_drop_roll unresolved');
      ops.push({op:'held_drop_roll',seed:Number(data.seed||0)+7,value:roll});
      if(roll<20){
        if(!input.held_reward_item || !held.includes(input.held_reward_item)) throw new Error('bounty_target held_reward_item unresolved');
        ops.push({op:'grant_items',items:[input.held_reward_item]});
      }
    }
  }
  ops.push({op:'clear_bounty'});
  return finish(event,ops,Number(input.battle_outcome)===1?'victory':'not_victory');
}
