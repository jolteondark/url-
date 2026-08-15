import { add } from './bag-economy-mart-flow.js';
function asInt(value,name){const n=Number(value);if(!Number.isInteger(n))throw new TypeError(`${name} must be an integer`);return n;}
function cloneSlots(slots){return (slots??[]).map(s=>s==null?null:[s[0],asInt(s[1],'slot count')]);}
export function resolveItemReceipt(input){
  const slots=cloneSlots(input.slots); const quantity=asInt(input.quantity??1,'quantity'); const operations=[];
  if(!input.itemValid||quantity<1)return {result:'invalid',success:false,slots,operations};
  const kind=input.kind;
  if(!['found','received','prize'].includes(kind))throw new RangeError('kind must be found, received or prize');
  if(kind==='received')operations.push({op:'announce_received'});
  operations.push({op:'bag_add',item:input.item,quantity});
  const success=add(slots,asInt(input.maxSlots,'maxSlots'),asInt(input.maxPerSlot,'maxPerSlot'),input.item,quantity);
  if(kind==='found')operations.push({op:'announce_found'});
  if(success){operations.push({op:'pocket_message',pocket:input.pocket??null});return {result:'stored',success:true,slots:slots.filter(Boolean),operations};}
  if(kind==='found')operations.push({op:'bag_full'});
  return {result:'bag_full',success:false,slots:slots.filter(Boolean),operations};
}
