import { canAdd, add, remove } from './bag-economy-mart-flow.js';
function asInt(v,n){const x=Number(v);if(!Number.isInteger(x))throw new TypeError(`${n} must be an integer`);return x;}
function clonePockets(pockets={}){const out={};for(const [key,p] of Object.entries(pockets)){out[key]={slots:(p.slots??[]).map(s=>s==null?null:[s[0],asInt(s[1],'slot count')]),maxSlots:asInt(p.maxSlots,'maxSlots'),maxPerSlot:asInt(p.maxPerSlot,'maxPerSlot')};}return out;}
export function resolveRewardTransaction(input={}){
 const pockets=clonePockets(input.pockets), meta=input.itemMeta??{}, counts=new Map(), operations=[];
 for(const id of (input.items??[])){const m=meta[id];if(!m?.valid)continue;counts.set(id,(counts.get(id)??0)+1);}
 if(counts.size===0)return {result:'empty',success:false,pockets,granted:[],operations};
 const entries=[...counts.entries()];
 for(const [id,qty] of entries){const m=meta[id], pocket=pockets[String(m.pocket)];const ok=!!pocket&&canAdd(pocket.slots,pocket.maxSlots,pocket.maxPerSlot,id,qty);operations.push({op:'preflight_can_add',item:id,quantity:qty,pocket:m.pocket,result:ok});if(!ok)return {result:'no_room',success:false,pockets,granted:[],operations};}
 const granted=[];
 for(const [id,qty] of entries){const m=meta[id], pocket=pockets[String(m.pocket)];const addAll=canAdd(pocket.slots,pocket.maxSlots,pocket.maxPerSlot,id,qty)&&add(pocket.slots,pocket.maxSlots,pocket.maxPerSlot,id,qty);operations.push({op:'bag_add_all',item:id,quantity:qty,pocket:m.pocket,result:addAll});if(!addAll){for(const old of granted){const op=meta[old.item], pp=pockets[String(op.pocket)];const rolled=remove(pp.slots,old.item,old.quantity);operations.push({op:'rollback_remove',item:old.item,quantity:old.quantity,pocket:op.pocket,result:rolled});}return {result:'add_failed',success:false,pockets,granted:[],operations};}granted.push({item:id,quantity:qty});}
 return {result:'granted',success:true,pockets,granted,operations};
}
