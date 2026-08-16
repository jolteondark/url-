import { resolveBerryContest } from './mapless-berry-contest-flow.js';
import { remove } from './bag-economy-mart-flow.js';

function cloneSlots(slots=[]){return slots.map(s=>s==null?null:[s[0],Number(s[1])]);}
function berryEntries(slots,grades={}){
  const totals=new Map();
  for(const slot of slots){if(!slot||!Object.hasOwn(grades,slot[0]))continue;totals.set(slot[0],(totals.get(slot[0])||0)+Number(slot[1]||0));}
  return [...totals].map(([id,qty])=>({id,qty,grade:Number(grades[id]||0)}));
}
export function resolveBerryContestWithBag(input={}){
  const slots=cloneSlots(input.slots||[]), grades=input.berry_grades||{}, entries=berryEntries(slots,grades), action=input.action;
  const bagOperations=[];
  let removeResult=input.remove_result;
  if(action==='single'&&input.selected_berry!=null){
    removeResult=remove(slots,input.selected_berry,1);
    bagOperations.push({op:'bag_remove',item:input.selected_berry,quantity:1,result:removeResult});
  }
  const event=resolveBerryContest({...input,berry_entries:entries,selected_grade:Number(grades[input.selected_berry]||input.selected_grade||0),remove_result:removeResult});
  if(action==='bulk'&&event.result===true){
    for(const op of event.operations.filter(x=>x.op==='remove_item')){
      const ok=remove(slots,op.item,op.quantity);
      bagOperations.push({op:'bag_remove',item:op.item,quantity:op.quantity,result:ok});
      if(ok!==op.result)throw new Error('berry_contest_bag_remove_mismatch');
    }
  }
  return {result:event.result,outcome:event.outcome,slots:slots.filter(Boolean),bag_operations:bagOperations,event_resolution:event};
}
