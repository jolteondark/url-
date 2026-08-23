import { canAdd, add, remove, quantity } from './bag-economy-mart-flow.js';
function asInt(v,n){const x=Number(v);if(!Number.isInteger(x))throw new TypeError(`${n} must be an integer`);return x;}
function clonePockets(pockets={}){const out={};for(const [key,p] of Object.entries(pockets)){out[key]={slots:(p.slots??[]).map(s=>s==null?null:[s[0],asInt(s[1],'slot count')]),maxSlots:asInt(p.maxSlots,'maxSlots'),maxPerSlot:asInt(p.maxPerSlot,'maxPerSlot')};}return out;}
function abort(result,original,operations){return {result,success:false,pockets:original,granted:[],consumed:[],operations};}
export function resolveRewardTransaction(input={}){
 const original=clonePockets(input.pockets), pockets=clonePockets(input.pockets), meta=input.itemMeta??{}, counts=new Map(), costCounts=new Map(), operations=[];
 for(const raw of (input.costs??[])){
  const id=raw?.item, qty=asInt(raw?.quantity??raw?.qty,'cost quantity');
  if(qty<=0)throw new RangeError('cost quantity must be positive');
  const m=meta[id];
  if(!m?.valid){operations.push({op:'preflight_cost_valid',item:id,quantity:qty,result:false});return abort('invalid_cost',original,operations);}
  costCounts.set(id,(costCounts.get(id)??0)+qty);
 }
 for(const id of (input.items??[])){const m=meta[id];if(!m?.valid)continue;counts.set(id,(counts.get(id)??0)+1);}
 if(counts.size===0)return abort('empty',original,operations);
 for(const [id,qty] of costCounts){const m=meta[id], pocket=pockets[String(m.pocket)], available=pocket?quantity(pocket.slots,id):0, ok=available>=qty;operations.push({op:'preflight_cost_owned',item:id,quantity:qty,pocket:m.pocket,available,result:ok});if(!ok)return abort('not_enough_items',original,operations);}
 const consumed=[];
 for(const [id,qty] of costCounts){const m=meta[id], pocket=pockets[String(m.pocket)], removed=!!pocket&&remove(pocket.slots,id,qty);operations.push({op:'bag_remove_cost',item:id,quantity:qty,pocket:m.pocket,result:removed});if(!removed)return abort('cost_remove_failed',original,operations);consumed.push({item:id,quantity:qty});}
 const entries=[...counts.entries()];
 for(const [id,qty] of entries){const m=meta[id], pocket=pockets[String(m.pocket)];const ok=!!pocket&&canAdd(pocket.slots,pocket.maxSlots,pocket.maxPerSlot,id,qty);operations.push({op:'preflight_can_add',item:id,quantity:qty,pocket:m.pocket,result:ok});if(!ok)return abort('no_room',original,operations);}
 const granted=[];
 for(const [id,qty] of entries){const m=meta[id], pocket=pockets[String(m.pocket)];const addAll=canAdd(pocket.slots,pocket.maxSlots,pocket.maxPerSlot,id,qty)&&add(pocket.slots,pocket.maxSlots,pocket.maxPerSlot,id,qty);operations.push({op:'bag_add_all',item:id,quantity:qty,pocket:m.pocket,result:addAll});if(!addAll)return abort('add_failed',original,operations);granted.push({item:id,quantity:qty});}
 return {result:'granted',success:true,pockets,granted,consumed,operations};
}
