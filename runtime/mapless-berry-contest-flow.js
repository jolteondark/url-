function cloneEvent(event={}){return {...event,normal_data:{...(event.normal_data||{})}};}
function finish(event,operations,outcome){event.normal_resolved=true;operations.push({op:'finish_event'});return {event,operations,result:true,outcome};}
function output(event,operations,outcome){return {event,operations,result:false,outcome};}
function entries(input){return (input.berry_entries||[]).map(x=>({id:x.id,qty:Number(x.qty||0),grade:Number(x.grade||0)}));}
function reward(ops,grade,count,exclude=null){ops.push({op:'reward_berry_grade',grade:Number(grade),count:Number(count),exclude});}
export function resolveBerryContest(input={}){
 const event=cloneEvent(input.event||{}),data=event.normal_data,ops=[];const action=input.action;
 ops.push({op:'present_choices',actions:['single','bulk','watch','leave']});
 if(!['single','bulk','watch','leave'].includes(action))return output(event,ops,'cancelled');
 if(action==='leave'){ops.push({op:'leave_event'});return finish(event,ops,'left');}
 if(action==='watch'){reward(ops,0,1);return finish(event,ops,'watched');}
 const berries=entries(input);
 if(action==='single'){
   const id=input.selected_berry??null;ops.push({op:'choose_berry',result:id});if(!id)return output(event,ops,'selection_cancelled');
   const e=berries.find(x=>x.id===id);const grade=e?e.grade:Number(input.selected_grade||0);
   const removeOk=input.remove_result!==false;ops.push({op:'remove_item',item:id,quantity:1,result:removeOk});if(!removeOk)return output(event,ops,'remove_failed');
   const score=grade*25+Number(data.rating_roll||0);ops.push({op:'judge_single',grade,score});
   if(score>=80){reward(ops,Math.min(grade+1,3),1);ops.push({op:'grant_random',tier:'small',quantity:1,result:input.random_reward_result!==false});return finish(event,ops,'winner');}
   if(score>=45){reward(ops,grade,2);return finish(event,ops,'placed');}
   reward(ops,grade,1,id);return finish(event,ops,'participation');
 }
 const general=berries.filter(x=>x.grade===0&&x.qty>0);const total=general.reduce((a,x)=>a+x.qty,0);ops.push({op:'check_general_berries',quantity:total});if(total<3)return output(event,ops,'not_enough_general_berries');
 let left=3;for(const e of general){if(left<=0)break;const take=Math.min(e.qty,left);ops.push({op:'remove_item',item:e.id,quantity:take,result:true});left-=take;}
 const count=input.seeded_reward_count===2?2:1;reward(ops,2,count);if(Number(data.bulk_roll||0)<15)ops.push({op:'grant_random',tier:'medium',quantity:1,result:input.random_reward_result!==false});
 return finish(event,ops,Number(data.bulk_roll||0)<15?'bulk_bonus':'bulk');
}
