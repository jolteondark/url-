function cloneEvent(event={}){return {...event,normal_data:{...(event.normal_data||{})}};}
function unresolved(event,operations,outcome,extra={}){return {event,operations,result:false,outcome,...extra};}
function finish(event,operations,outcome,extra={}){event.normal_resolved=true;operations.push({op:'finish_event'});return {event,operations,result:true,outcome,...extra};}
function mealEffect(operations,meal,battles,currentDay){
 if(meal==='heal')operations.push({op:'heal_party_percent',percent:50,revive:false});
 else if(meal==='medicine')operations.push({op:'heal_party_status'});
 else if(meal==='power')operations.push({op:'set_power_meal',battles:Number(battles),day:Number(currentDay||1)});
}
export function resolveTravelingCook(input={}){
 const event=cloneEvent(input.event||{}),data=event.normal_data,operations=[];
 const scaling=Number(input.scaling_value||0),price=600+scaling*100,choice=input.choice;
 operations.push({op:'present_choices',price,choices:['berries','paid','prototype','leave']});
 if(!['berries','paid','prototype','leave'].includes(choice))return unresolved(event,operations,'cancelled',{price});
 if(choice==='leave'){operations.push({op:'leave_event'});return finish(event,operations,'left',{price});}
 const meal=input.meal;
 if(choice==='berries'){
   const entries=(input.berry_entries||[]).map(x=>({id:x.id,qty:Number(x.qty||0)}));
   const total=entries.reduce((s,x)=>s+x.qty,0);operations.push({op:'check_berries',quantity:total});
   if(total<3)return unresolved(event,operations,'not_enough_berries',{price});
   operations.push({op:'choose_meal',result:meal??null});
   if(!['heal','medicine','power'].includes(meal))return unresolved(event,operations,'meal_cancelled',{price});
   let remaining=3;const plan=[];for(const e of entries){if(remaining<=0)break;const take=Math.min(e.qty,remaining);if(take>0)plan.push({item:e.id,quantity:take});remaining-=take;}
   const consumed=input.consume_berries_result!==false;operations.push({op:'consume_berries',count:3,plan,result:consumed});
   if(!consumed)return unresolved(event,operations,'berry_consume_failed',{price});
   mealEffect(operations,meal,3,input.current_day);return finish(event,operations,'berry_meal',{price});
 }
 if(choice==='paid'){
   const spent=input.spend_money_result!==false;operations.push({op:'spend_money',amount:price,result:spent});
   if(!spent)return unresolved(event,operations,'payment_failed',{price});
   operations.push({op:'choose_meal',result:meal??null});
   if(!['heal','medicine','power'].includes(meal)){operations.push({op:'refund_money',amount:price});return unresolved(event,operations,'meal_cancelled_refunded',{price});}
   mealEffect(operations,meal,3,input.current_day);return finish(event,operations,'paid_meal',{price});
 }
 const roll=Number(data.prototype_roll||0);operations.push({op:'prototype_roll',value:roll});
 if(roll<40){mealEffect(operations,'heal',0,input.current_day);return finish(event,operations,'prototype_heal',{price});}
 if(roll<65){mealEffect(operations,'medicine',0,input.current_day);return finish(event,operations,'prototype_medicine',{price});}
 if(roll<85){mealEffect(operations,'power',1,input.current_day);return finish(event,operations,'prototype_power',{price});}
 if(roll<95){operations.push({op:'inflict_status',party_index:0,status:'CONFUSION'});return finish(event,operations,'prototype_confusion',{price});}
 operations.push({op:'damage_party',percent:10});return finish(event,operations,'prototype_damage',{price});
}
