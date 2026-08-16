function out(event,operations,result,outcome){return {event,operations,result,outcome,money_delta:operations.filter(x=>x.op==='add_money').reduce((a,x)=>a+x.amount,0)-operations.filter(x=>x.op==='spend_money'&&x.result!==false).reduce((a,x)=>a+x.amount,0),battle_requested:operations.some(x=>x.op==='start_wild_battle'),reward_granted:operations.some(x=>x.op==='grant_random'),party_mutated:operations.some(x=>['heal_party_percent','full_heal_party','inflict_status','add_bonus'].includes(x.op))};}
function finish(event,operations,outcome){event.normal_resolved=true;operations.push({op:'finish_event'});return out(event,operations,true,outcome);}
export function resolveWishingFountain(input={}){
 const event={...(input.event||{})};event.normal_data={...((input.event||{}).normal_data||{})};const data=event.normal_data;const operations=[];const choice=input.action;
 operations.push({op:'present_fountain_choices',actions:['small_wish','large_wish','reach','leave']});
 if(!['small_wish','large_wish','reach','leave'].includes(choice))return out(event,operations,false,'cancelled');
 if(choice==='leave'){operations.push({op:'leave_event'});return finish(event,operations,'left');}
 if(choice==='small_wish'){
  operations.push({op:'spend_money',amount:200,result:input.spend_result!==false});if(input.spend_result===false)return out(event,operations,false,'payment_failed');
  const roll=Number(data.small_roll||0);operations.push({op:'small_roll',value:roll});
  if(roll<50){operations.push({op:'heal_party_percent',percent:25,include_pp:false,result:input.heal_result!==false});return finish(event,operations,'small_heal');}
  if(roll<80){operations.push({op:'grant_random',tier:'small',quantity:1,result:input.reward_result!==false});return finish(event,operations,'small_reward');}
  return finish(event,operations,'small_nothing');
 }
 if(choice==='large_wish'){
  const price=1200+Number(input.scaling_value||0)*200;operations.push({op:'spend_money',amount:price,result:input.spend_result!==false});if(input.spend_result===false)return out(event,operations,false,'payment_failed');
  const roll=Number(data.large_roll||0);operations.push({op:'large_roll',value:roll});
  if(roll<45){operations.push({op:'grant_random',tier:'large',quantity:1,result:input.reward_result!==false});return finish(event,operations,'large_reward');}
  if(roll<65){operations.push({op:'choose_pokemon',allow_egg:true,result:input.chosen_pokemon||null});if(input.chosen_pokemon)operations.push({op:'add_bonus',pokemon:input.chosen_pokemon,stat:data.bonus_stat,amount:1,result:input.bonus_result!==false});return finish(event,operations,input.chosen_pokemon?'large_bonus':'large_bonus_skipped');}
  if(roll<85){operations.push({op:'full_heal_party',result:input.heal_result!==false});return finish(event,operations,'large_full_heal');}
  if(roll<95){operations.push({op:'grant_random',tier:'large',quantity:1,result:input.reward_result!==false});return finish(event,operations,'large_old_offering');}
  return finish(event,operations,'large_nothing');
 }
 const roll=Number(data.reach_roll||0);operations.push({op:'reach_roll',value:roll});
 if(roll<40){const amount=500+Number(input.scaling_value||0)*150;operations.push({op:'add_money',amount,result:input.money_result!==false});return finish(event,operations,'reach_money');}
 if(roll<70){const type=input.reach_battle_type||null;operations.push({op:'resolve_reach_battle_type',seed:Number(event.normal_seed||0),candidates:['WATER','GHOST'],result:type},{op:'start_wild_battle',type,modifier:0,seed:Number(event.normal_seed||0),result:input.battle_result??null});return finish(event,operations,'reach_battle');}
 if(roll<90){operations.push({op:'resolve_random_status',seed:Number(event.normal_seed||0),result:input.reach_status||null},{op:'inflict_status',target:'active_party_0',status:input.reach_status||null,result:input.status_result!==false});return finish(event,operations,'reach_status');}
 operations.push({op:'grant_random',tier:'large',quantity:1,result:input.reward_result!==false});return finish(event,operations,'reach_large_reward');
}
