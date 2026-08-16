const TASKS={cooking:{name:'料理と湯沸かし',types:['FIRE','WATER']},repair:{name:'道具修理',types:['ELECTRIC','STEEL']},watch:{name:'夜の見張り',types:['DARK','GHOST']},carry:{name:'荷物運び',types:['FIGHTING','NORMAL']},herbs:{name:'薬草集め',types:['GRASS','BUG']}};
function output(event,operations,result,outcome){return {event,operations,result,outcome,money_delta:operations.filter(x=>x.op==='spend_money'&&x.result!==false).reduce((a,x)=>a-x.amount,0),reward_requested:operations.some(x=>x.op==='grant_random'),heal_requested:operations.some(x=>x.op==='heal_party_percent'),exp_requested:operations.some(x=>x.op==='gain_small_exp')};}
function finish(event,ops,outcome){event.normal_resolved=true;ops.push({op:'finish_event'});return output(event,ops,true,outcome);}
export function resolveTrainerCamp(input={}){
 const event={...(input.event||{})};event.normal_data={...((input.event||{}).normal_data||{})};const data=event.normal_data;const task=TASKS[data.task]||null;const ops=[];
 if(!task)return output(event,[{op:'invalid_task',task:data.task??null}],false,'invalid_task');
 const suitable=input.suitable_type&&task.types.includes(input.suitable_type)?input.suitable_type:null;const mealPrice=450+Number(input.scaling_value||0)*50;
 const actions=[];if(suitable)actions.push('type');actions.push('manual','buy','leave');ops.push({op:'present_camp_choices',task:data.task,task_name:task.name,suitable_type:suitable,meal_price:mealPrice,actions});
 const action=input.action;if(!actions.includes(action))return output(event,ops,false,'cancelled');
 if(action==='leave'){ops.push({op:'leave_event'});return finish(event,ops,'left');}
 if(action==='type'){
   const p=input.chosen_pokemon||null;ops.push({op:'choose_pokemon',allow_egg:false,required_type:suitable,result:p});if(!p)return output(event,ops,false,'pokemon_cancelled');
   ops.push({op:'camp_task',task:data.task},{op:'heal_party_percent',percent:50,cure_status:true,result:input.heal_result!==false},{op:'grant_random',tier:'medium',quantity:1,result:input.reward_result!==false},{op:'gain_small_exp',pokemon:p,amount:35+Number(input.current_day||0)*5,result:input.exp_result!==false});return finish(event,ops,'type_help');
 }
 if(action==='manual'){
   ops.push({op:'camp_task',task:data.task},{op:'heal_party_percent',percent:25,cure_status:false,result:input.heal_result!==false});if(!data.manual_fail)ops.push({op:'grant_random',tier:'small',quantity:1,result:input.reward_result!==false});return finish(event,ops,data.manual_fail?'manual_fail':'manual_success');
 }
 ops.push({op:'spend_money',amount:mealPrice,result:input.spend_result!==false});if(input.spend_result===false)return output(event,ops,false,'payment_failed');ops.push({op:'meal_served'},{op:'heal_party_percent',percent:50,cure_status:false,result:input.heal_result!==false});return finish(event,ops,'meal_bought');
}
