import { resolveFakeNurse } from "./mapless-fake-nurse-flow.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import {
  healSafariPartyFull,
  healSafariPartyPercent,
  inflictSafariOverworldStatus,
} from "./safari-pokemon-healing.js";
import { hasSafariUsablePartyType } from "./safari-pokemon-type-membership.js";
import {
  applySafariSmallItemReward,
  preflightSafariSharedSmallItemReward,
} from "./safari-small-item-reward.js";
import {
  borrowSafariSharedRunRandomInt,
  ensureSafariEncounterSeed,
} from "./safari-encounter-randomization.js";
import { registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";
import { activateSafariNormalEventTrainerBattle } from "./safari-web-combat-start.js";

const RANDOM_STATUSES = Object.freeze(["POISON", "PARALYSIS", "BURN", "SLEEP"]);
function stateOf(runtime){const state=runtime?.variables?.mapless;if(!state||typeof state!=="object"||Array.isArray(state))throw new TypeError("runtime variables.mapless state is required");return state;}
function scalingValue(day){return Math.max(Math.floor((Math.max(1,Number(day)||1)-1)/5),0);}
function warned(runtime,event){return event?.normal_data?.fake===true&&hasSafariUsablePartyType(runtime,"DARK","PSYCHIC");}
function battleSucceeded(summary={}){const decision=Number(summary.decision);return decision===1||decision===4;}
function trainerRequest(owner){return (owner.operations??[]).find((operation)=>operation?.op==="start_trainer_battle_request")??null;}
function addSpend(runtime,amount){runtime.bag??={slots:[],money:0};runtime.bag.money=Math.max(0,Math.trunc(Number(runtime.bag.money??0))-amount);return {op:"runtime_spend_money",amount};}
function sharedSmallReward(runtime){
  const state=stateOf(runtime);ensureSafariEncounterSeed(state);const counter=state.preview_encounter_counter;
  const reward=preflightSafariSharedSmallItemReward(runtime,(limit)=>borrowSafariSharedRunRandomInt(runtime,limit),1);
  if(!reward.success)state.preview_encounter_counter=counter;
  return {reward,counter};
}
function commit(runtime,index,owner,applied=[]){
  const state=stateOf(runtime);state.board_events[index]=owner.event;state.board_consumed[index]=Boolean(owner.event.normal_resolved);
  state.last_operations=[...(owner.operations??[]).filter((operation)=>!["spend_money","full_heal_party","heal_party_percent","inflict_status","grant_random","start_trainer_battle_request"].includes(operation?.op)).map((operation)=>structuredClone(operation)),...applied,{op:"request_save",reason:"fake_nurse_resolved"}];
  return state;
}

registerSafariNormalEventBattleContinuation("fake_nurse",(runtime,continuation)=>{
  if(continuation.actionId!=="check_id")throw new Error(`unsupported fake_nurse Battle continuation action: ${continuation.actionId}`);
  const state=stateOf(runtime),index=Number(continuation.boardIndex),event=state.board_events?.[index];
  if(!event||event.kind!=="normal_event"||event.normal_event_id!=="fake_nurse")throw new Error("fake_nurse continuation requires originating event");
  const success=battleSucceeded(continuation.battleReturn);
  const owner=resolveFakeNurse({event,choice:"check_id",has_dark_or_psychic:warned(runtime,event),scaling_value:scalingValue(state.day),battle_result:continuation.battleReturn,battle_success:success});
  commit(runtime,index,owner);
  state.notice=success?"偽看護師との勝負に勝ちました。":"偽看護師との勝負を終えました。";
  return {runtime,result:owner.outcome,completed:true,terminal:true,operations:state.last_operations,notice:state.notice,persistenceRequested:true,owner};
});

export function safariFakeNurseWarning(runtime,index){
  const event=stateOf(runtime).board_events?.[index];return warned(runtime,event);
}

export async function resolveSafariFakeNurseInteraction(runtime,index,choice){
  const state=stateOf(runtime),event=state.board_events?.[index];
  if(!event||event.kind!=="normal_event"||event.normal_event_id!=="fake_nurse")throw new Error("fake_nurse board event is required");
  if(state.battle&&!state.battle.completed)return {runtime,result:"battle_active",operations:[]};
  if(state.shop)return {runtime,result:"shop_active",operations:[]};
  if(state.board_consumed?.[index])return {runtime,result:"already_consumed",operations:[]};
  state.board_revealed[index]=true;state.board_visited[index]=true;
  const scale=scalingValue(state.day),price=500+scale*100,isWarned=warned(runtime,event),raw=String(choice??"");
  const availableActions=["pay","check_id:heal","check_id:leave","leave"];
  if(!availableActions.includes(raw))return {runtime,result:"unsupported_action",completed:false,operations:[],availableActions};

  if(raw==="leave"){
    const owner=resolveFakeNurse({event,choice:"leave",has_dark_or_psychic:isWarned,scaling_value:scale});
    commit(runtime,index,owner);state.notice="簡易診療所を離れました。";
    return {runtime,result:owner.outcome,completed:true,operations:state.last_operations,notice:state.notice,persistenceRequested:true,owner};
  }

  if(raw==="pay"){
    const spendSuccess=Number(runtime.bag?.money??0)>=price;
    const randomStatus=event.normal_data?.fake===true?RANDOM_STATUSES[new RubyMT19937Random(Number(event.normal_seed??0)&0x7fffffff).randInt(4)]:null;
    const owner=resolveFakeNurse({event,choice:"pay",has_dark_or_psychic:isWarned,scaling_value:scale,spend_money_result:spendSuccess,random_status:randomStatus});
    if(!owner.result){state.notice=`治療には${price}円必要です。`;return {runtime,result:owner.outcome,completed:false,price,operations:owner.operations??[],notice:state.notice,persistenceRequested:false,owner};}
    const applied=[addSpend(runtime,price)];
    if(owner.outcome==="real_paid_heal"){healSafariPartyFull(runtime);applied.push({op:"runtime_full_heal_party"});}
    else if(owner.outcome==="fake_paid_trap"){
      const partyIndex=(runtime.player?.party??[]).findIndex((pokemon)=>Number(pokemon?.hp??0)>0);
      if(partyIndex>=0){runtime.player.party[partyIndex]=inflictSafariOverworldStatus(runtime.player.party[partyIndex],randomStatus);applied.push({op:"runtime_inflict_status",party_index:partyIndex,status:randomStatus});}
    }
    commit(runtime,index,owner,applied);
    state.notice=owner.outcome==="real_paid_heal"?"看護師の治療で手持ちが完全回復しました。":`偽看護師でした。先頭のポケモンが${randomStatus}になりました。`;
    return {runtime,result:owner.outcome,completed:true,price,randomStatus,operations:state.last_operations,notice:state.notice,persistenceRequested:true,owner};
  }

  const idCheckChoice=raw.endsWith(":heal")?"heal":"leave";
  if(event.normal_data?.fake!==true){
    const halfPrice=Math.max(Math.floor(price/2),1),spendSuccess=idCheckChoice!=="heal"||Number(runtime.bag?.money??0)>=halfPrice;
    const owner=resolveFakeNurse({event,choice:"check_id",has_dark_or_psychic:isWarned,scaling_value:scale,id_check_choice:idCheckChoice,half_spend_money_result:spendSuccess});
    const applied=[];
    if(idCheckChoice==="heal"&&spendSuccess){applied.push(addSpend(runtime,halfPrice));healSafariPartyPercent(runtime,50);applied.push({op:"runtime_heal_party_percent",percent:50,revive:false});}
    commit(runtime,index,owner,applied);
    state.notice=idCheckChoice==="heal"&&spendSuccess?`身分証を確認し、${halfPrice}円で手持ちを50%回復しました。`:idCheckChoice==="heal"?`本物でしたが、半額治療には${halfPrice}円必要です。`:"身分証を確認すると本物でした。治療は断りました。";
    return {runtime,result:owner.outcome,completed:true,halfPrice,operations:state.last_operations,notice:state.notice,persistenceRequested:true,owner};
  }

  const idRoll=Number(event.normal_data?.id_roll??0);
  if(idRoll<50){
    const projected=sharedSmallReward(runtime),reward=projected.reward;
    if(!reward.success){state.notice="偽看護師が落とした道具を受け取る空きがありません。イベントはまだ完了していません。";return {runtime,result:"reward_bag_full",completed:false,operations:reward.operations??[],notice:state.notice,persistenceRequested:false,availableActions};}
    const owner=resolveFakeNurse({event,choice:"check_id",has_dark_or_psychic:isWarned,scaling_value:scale,grant_random_result:true});
    const applied=[...(reward.operations??[]).map((operation)=>structuredClone(operation)),...applySafariSmallItemReward(runtime,reward)];
    commit(runtime,index,owner,applied);state.notice=`偽看護師は逃げ出し、${reward.selectedItems?.[0]??"道具"}を落としていきました。`;
    return {runtime,result:owner.outcome,completed:true,reward,operations:state.last_operations,notice:state.notice,persistenceRequested:true,owner};
  }

  const preview=resolveFakeNurse({event,choice:"check_id",has_dark_or_psychic:isWarned,scaling_value:scale,battle_success:false});
  const battleEvent=trainerRequest(preview);if(!battleEvent)throw new Error("fake_nurse ID check route requires canonical trainer Battle request");
  const started=await activateSafariNormalEventTrainerBattle(runtime,index,{eventId:"fake_nurse",actionId:"check_id",battleEvent,request:structuredClone(battleEvent),payload:{fake:true,id_roll:idRoll}});
  if(started.result==="normal_event_trainer_battle_started"&&state.battle)globalThis.__maplessNormalEventUi=null;
  return started;
}

export function interactiveSafariFakeNurse(runtime,index){
  const state=stateOf(runtime),price=500+scalingValue(state.day)*100;
  state.board_revealed[index]=true;state.board_visited[index]=true;
  state.notice=safariFakeNurseWarning(runtime,index)?`簡易診療所。${price}円で治療を受けられますが、手持ちが違和感を覚えています。`:`簡易診療所。${price}円で治療を受けられます。`;
  return {runtime,result:"fake_nurse_ready",boundary:"normal_event",notice:state.notice,operations:[]};
}
