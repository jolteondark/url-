function cloneEvent(event={}){return {...event,normal_data:{...(event.normal_data||{})}};}
function unresolved(event,operations,outcome){return {event,operations,result:false,outcome};}
function finish(event,operations,outcome){event.normal_resolved=true;operations.push({op:'finish_event'});return {event,operations,result:true,outcome};}
export function resolveLostBag(input={}){
 const event=cloneEvent(input.event||{}),data=event.normal_data,operations=[];
 const warned=data.trap===true&&input.has_dark_or_psychic===true;
 if(warned)operations.push({op:'warn_lost_bag',types:['DARK','PSYCHIC']});
 operations.push({op:'present_choices',choices:['open','wait','leave']});
 const choice=input.choice;
 if(!['open','wait','leave'].includes(choice))return unresolved(event,operations,'cancelled');
 if(choice==='leave'){operations.push({op:'leave_event'});return finish(event,operations,'left');}
 if(choice==='open'){
  operations.push({op:'bag_open'});
  if(data.trap===true){
   operations.push({op:'trap_reveal'});
   operations.push({op:'start_trainer_battle_request',modifier:0,extra_pokemon:false,seed:event.normal_seed??null,result:input.battle_result??null});
   if(input.battle_success===true)operations.push({op:'grant_random',tier:'medium',count:1,result:input.grant_random_result!==false});
   return finish(event,operations,input.battle_success===true?'trap_open_won':'trap_open_finished');
  }
  operations.push({op:'grant_random',tier:'medium',count:2,day:input.current_day??null,seed:event.normal_seed??null,result:input.grant_random_result!==false});
  return finish(event,operations,'safe_open_reward');
 }
 if(data.trap===true){
  operations.push({op:'trap_reveal'});
  operations.push({op:'start_trainer_battle_request',modifier:1,extra_pokemon:true,seed:event.normal_seed??null,result:input.battle_result??null});
  if(input.battle_success===true){
   const amount=800+Number(input.scaling_value||0)*180;
   operations.push({op:'add_money',amount,result:input.add_money_result!==false});
   operations.push({op:'grant_random',tier:'medium',count:1,result:input.grant_random_result!==false});
  }
  return finish(event,operations,input.battle_success===true?'trap_wait_won':'trap_wait_finished');
 }
 const waitRoll=Number(data.wait_roll||0);operations.push({op:'wait_roll',value:waitRoll});
 if(waitRoll<70){
  operations.push({op:'grant_random',tier:'medium',count:1,result:input.grant_random_result!==false});
  operations.push({op:'add_money',amount:500+Number(input.scaling_value||0)*100,result:input.add_money_result!==false});
  return finish(event,operations,'owner_returned');
 }
 return finish(event,operations,'owner_never_returned');
}
