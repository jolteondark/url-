import { resolveTreasureBoardRewardSlice } from './mapless-treasure-board-reward-slice.js';
import { resolveRewardTransaction } from './bag-economy-reward-transaction.js';
import { setMoney } from './bag-economy-mart-flow.js';

function clone(value){return structuredClone(value ?? {});}

export function resolveTreasureBagMoneyIntegration(input={}){
  const originalPockets=clone(input.pockets); const originalMoney=Number(input.money??0); const reward=input.reward;
  if(!reward || typeof reward!=='object') return {treasure:resolveTreasureBoardRewardSlice(input),pockets:originalPockets,money:originalMoney,bagTransaction:null,moneyDelta:0};
  const items=[]; for(const [id,qty] of Object.entries(reward.items??{})) for(let i=0;i<Number(qty);i+=1) items.push(id);
  let tx=null, pockets=clone(originalPockets), capacity_results={}, add_results={};
  if(items.length){
    tx=resolveRewardTransaction({pockets,itemMeta:input.itemMeta??{},items});
    pockets=clone(tx.pockets);
    if(tx.success){for(const id of Object.keys(reward.items??{})){capacity_results[id]=true;add_results[id]=true;}}
    else if(tx.result==='no_room'){
      const failed=tx.operations.find(x=>x.op==='preflight_can_add'&&x.result===false); if(failed) capacity_results[failed.item]=false;
    } else {
      const failed=tx.operations.find(x=>x.op==='bag_add_all'&&x.result===false); if(failed) add_results[failed.item]=false;
    }
  }
  const itemOk=!items.length || tx?.success===true;
  const moneyAmount=Math.max(0,Number(reward.money??0));
  const money=itemOk?setMoney(originalMoney+moneyAmount,Number(input.maxMoney??9999999)):originalMoney;
  const treasure=resolveTreasureBoardRewardSlice({...input,capacity_results,add_results,money_result:itemOk});
  if(!treasure.result) return {treasure,pockets:originalPockets,money:originalMoney,bagTransaction:tx,moneyDelta:0};
  return {treasure,pockets,money,bagTransaction:tx,moneyDelta:money-originalMoney};
}
