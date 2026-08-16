function cloneEvent(event={}){return {...event,normal_data:{...(event.normal_data||{})}};}
function finish(event,ops,outcome){event.normal_resolved=true;ops.push({op:'finish_event'});return {event,operations:ops,result:true,outcome};}
function unresolved(event,ops,outcome){return {event,operations:ops,result:false,outcome};}
function applyOutcome(event,ops,{roll,good_limit,neutral_limit,effect_index=0,selected_pokemon=null,grant_result=true,low_item=null,scaling_value=0,type_id=null}={}){
  ops.push({op:'statue_outcome_roll',roll,good_limit,neutral_limit,effect_index});
  if(roll<good_limit){
    if(effect_index===0) ops.push({op:'full_heal_party'});
    else if(effect_index===1){ops.push({op:'choose_pokemon',allow_egg:true,result:selected_pokemon}); if(selected_pokemon)ops.push({op:'add_bonus',pokemon:selected_pokemon,stat:null,amount:1,result:grant_result!==false});}
    else if(effect_index===2) ops.push({op:'grant_random',tier:'medium',count:1});
    else if(effect_index===3) ops.push({op:'grant_statue_treasure',candidates:['NUGGET','STARPIECE','COMETSHARD'],result:grant_result!==false});
    else if(effect_index===4) ops.push({op:'reveal_random_board_cell'});
    else if(effect_index===5) ops.push({op:'set_power_meal',battles:1});
    return;
  }
  if(roll<neutral_limit){
    if(effect_index===0) ops.push({op:'start_wild_battle',type:type_id||'RANDOM_TYPE',modifier:0,cannot_run:false,seed:event.normal_seed});
    else if(effect_index===1) ops.push({op:'add_money',amount:300+Number(scaling_value||0)*50});
    else ops.push({op:'statue_no_effect'});
    return;
  }
  if(effect_index===0) ops.push({op:'inflict_status',target:'active_party_0',status:'CALLER_RESOLVED_RANDOM_STATUS'});
  else if(effect_index===1) ops.push({op:'damage_party',percent:10});
  else if(low_item) ops.push({op:'remove_item',item:low_item,quantity:1});
  else ops.push({op:'statue_bad_wind_no_item'});
}
export function resolveOldStatue(input={}){
  const event=cloneEvent(input.event||{}),data=event.normal_data,ops=[];
  const choice=input.choice;
  ops.push({op:'present_statue_choices',choices:['pray','offer','break','leave']});
  if(choice==null||choice==='cancel')return unresolved(event,ops,'cancelled');
  if(choice==='leave'){ops.push({op:'leave_event'});return finish(event,ops,'left');}
  if(choice==='pray'){
    applyOutcome(event,ops,{...input.outcome,roll:Number(data.pray_roll||0),good_limit:50,neutral_limit:80,scaling_value:input.scaling_value});
    return finish(event,ops,'prayed');
  }
  if(choice==='offer'){
    ops.push({op:'choose_consumable',result:input.offered_item||null});
    if(!input.offered_item)return unresolved(event,ops,'offer_cancelled');
    const removed=input.remove_result!==false;ops.push({op:'remove_item',item:input.offered_item,quantity:1,result:removed});
    if(!removed)return unresolved(event,ops,'offer_remove_failed');
    applyOutcome(event,ops,{...input.outcome,roll:Number(data.offer_roll||0),good_limit:75,neutral_limit:95,scaling_value:input.scaling_value});
    return finish(event,ops,'offered');
  }
  if(choice==='break'){
    const roll=Number(data.break_roll||0);ops.push({op:'statue_break_roll',roll});
    if(roll<50){
      ops.push({op:'start_wild_battle',type:'ROCK',modifier:2,cannot_run:true,seed:event.normal_seed});
      if(input.battle_success===true)ops.push({op:'grant_random',tier:'large',count:1});
      return finish(event,ops,input.battle_success===true?'guardian_defeated':'guardian_battle_finished');
    }
    if(roll<80){ops.push({op:'grant_statue_mineral',candidates:['NUGGET','STARPIECE','COMETSHARD','HARDSTONE'],result:input.grant_result!==false});return finish(event,ops,'mineral_found');}
    if(roll<95){ops.push({op:'grant_random',tier:'large',count:1});return finish(event,ops,'old_offering_found');}
    ops.push({op:'damage_party',percent:15});return finish(event,ops,'collapse_damage');
  }
  return unresolved(event,ops,'invalid_choice');
}
