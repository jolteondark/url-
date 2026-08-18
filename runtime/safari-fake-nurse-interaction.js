import { resolveFakeNurse } from "./mapless-fake-nurse-flow.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { healSafariPartyFull, inflictSafariOverworldStatus } from "./safari-pokemon-healing.js";

const RANDOM_STATUSES = Object.freeze(["POISON", "PARALYSIS", "BURN", "SLEEP"]);
function stateOf(runtime){const state=runtime?.variables?.mapless;if(!state||typeof state!=="object"||Array.isArray(state))throw new TypeError("runtime variables.mapless state is required");return state;}
function scalingValue(day){return Math.max(Math.floor((Math.max(1,Number(day)||1)-1)/5),0);}

export function resolveSafariFakeNurseInteraction(runtime,index,choice){
  const state=stateOf(runtime), event=state.board_events?.[index];
  if(!event||event.kind!=="normal_event"||event.normal_event_id!=="fake_nurse")throw new Error("fake_nurse board event is required");
  if(state.battle&&!state.battle.completed)return {runtime,result:"battle_active",operations:[]};
  if(state.shop)return {runtime,result:"shop_active",operations:[]};
  if(state.board_consumed?.[index])return {runtime,result:"already_consumed",operations:[]};
  state.board_revealed[index]=true; state.board_visited[index]=true;
  const price=500+scalingValue(state.day)*100;
  const spendSuccess=choice!=="pay"||Number(runtime.bag?.money??0)>=price;
  const randomStatus=event.normal_data?.fake===true?RANDOM_STATUSES[new RubyMT19937Random(Number(event.normal_seed??0)&0x7fffffff).randInt(4)]:null;
  const owner=resolveFakeNurse({event,choice,scaling_value:scalingValue(state.day),spend_money_result:spendSuccess,random_status:randomStatus});
  const applied=[];
  if(owner.result&&choice==="pay"){
    runtime.bag??={slots:[],money:0}; runtime.bag.money=Math.max(0,Math.trunc(Number(runtime.bag.money??0))-price);
    applied.push({op:"runtime_spend_money",amount:price});
    if(owner.outcome==="real_paid_heal"){healSafariPartyFull(runtime);applied.push({op:"runtime_full_heal_party"});}
    else if(owner.outcome==="fake_paid_trap"){
      const idx=(runtime.player?.party??[]).findIndex(p=>Number(p?.hp??0)>0);
      if(idx>=0){runtime.player.party[idx]=inflictSafariOverworldStatus(runtime.player.party[idx],randomStatus);applied.push({op:"runtime_inflict_status",party_index:idx,status:randomStatus});}
    }
  }
  state.board_events[index]=owner.event; state.board_consumed[index]=Boolean(owner.event.normal_resolved);
  state.last_operations=[...(owner.operations??[]).map(op=>structuredClone(op)),...applied];
  state.notice=owner.outcome==="real_paid_heal"?"看護師の治療で手持ちが完全回復しました。":owner.outcome==="fake_paid_trap"?`偽看護師でした。先頭のポケモンが${randomStatus}になりました。`:owner.outcome==="payment_failed"?`治療には${price}円必要です。`:"簡易診療所を離れました。";
  return {runtime,result:owner.outcome,completed:Boolean(owner.result),price,randomStatus,operations:state.last_operations,notice:state.notice,persistenceRequested:Boolean(owner.result),owner};
}

export function interactiveSafariFakeNurse(runtime,index){
  const state=stateOf(runtime), price=500+scalingValue(state.day)*100;
  const confirmFn=typeof globalThis.confirm==="function"?globalThis.confirm.bind(globalThis):null;
  if(!confirmFn){state.board_revealed[index]=true;state.board_visited[index]=true;state.notice=`簡易診療所。${price}円で治療を受けられます。`;return {runtime,result:"fake_nurse_ready",boundary:"normal_event",notice:state.notice,operations:[]};}
  const pay=confirmFn(`簡易診療所です。\n${price}円を払って治療を受けますか？\n（キャンセルで警戒して立ち去る）`);
  return {...resolveSafariFakeNurseInteraction(runtime,index,pay?"pay":"leave"),boundary:"normal_event"};
}
