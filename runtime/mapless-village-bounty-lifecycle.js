import {resolveVillageBountyDepart} from './mapless-village-bounty-money-integration.js';
const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
export function resolveVillageBountyAccept(input={}){
 const facilityId=String(input.facility_id??input.facility?.id??'').toLowerCase();const state=input.village?{...input.village,bounties:copy(input.village.bounties||[]),active_bounty:copy(input.village.active_bounty||null)}:null;const operations=[];
 if(facilityId!=='bounty_board'){operations.push({op:'delegate_facility',facility_id:facilityId||null});return{state,operations,result:'delegated',accepted:false};}
 if(!state)return{state,operations,result:false,accepted:false};
 if(Number(state.actions_left??0)<=0){operations.push({op:'message',key:'no_actions'});return{state,operations,result:false,accepted:false};}
 operations.push({op:'request_repair_bounties'});const quests=copy(input.repaired_bounties??state.bounties??[]);state.bounties=quests;
 if(!quests.length){operations.push({op:'message',key:'no_quests'},{op:'request_save'});return{state,operations,result:false,accepted:false};}
 if(state.bounty_board_locked){operations.push({op:'message',key:'board_locked'},{op:'request_save'});return{state,operations,result:false,accepted:false};}
 if(state.active_bounty){operations.push({op:'message',key:'already_active'},{op:'request_save'});return{state,operations,result:false,accepted:false};}
 operations.push({op:'request_bounty_board_selection',count:quests.length});const choice=input.choice;if(choice==null||!Number.isInteger(Number(choice))){operations.push({op:'request_save'});return{state,operations,result:false,accepted:false};}const quest=quests[Number(choice)]||null;if(!quest){operations.push({op:'request_save'});return{state,operations,result:false,accepted:false};}
 operations.push({op:'request_species_projection',species:quest.species,form:Number(quest.form??0)},{op:'confirm_bounty_accept',prefix:quest.prefix??null,species_name:input.species_name??null});
 if(input.accept_confirmed===true){state.active_bounty=copy(quest);state.bounty_board_locked=true;operations.push({op:'set_active_bounty',value:copy(quest)},{op:'set_bounty_board_locked',value:true},{op:'quest_accept_feedback'},{op:'message',key:'bounty_accepted'},{op:'request_save'});state.actions_left=Math.max(0,Number(state.actions_left??0)-1);operations.push({op:'consume_village_action',count:1},{op:'request_save'});return{state,operations,result:true,accepted:true};}
 operations.push({op:'request_save'});return{state,operations,result:false,accepted:false};
}
export function resolveVillageBountyLifecycle(input={}){
 const accepted=resolveVillageBountyAccept(input);if(!accepted.accepted||input.depart_after_accept!==true)return{phase:'accept',accept:accepted,depart:null,state:accepted.state,operations:accepted.operations,result:accepted.result,reward_requested:false};
 const depart=resolveVillageBountyDepart({village:accepted.state,able_pokemon_count:input.able_pokemon_count,confirmed:input.depart_confirmed,consume_action_success:input.depart_consume_action_success,outcome:input.outcome,money_gained:input.money_gained,error:input.depart_error,run_end_pending:input.run_end_pending,action_limit:input.action_limit});
 return{phase:'depart',accept:accepted,depart,state:depart.state,operations:[...accepted.operations,...depart.operations],result:depart.result,reward_requested:depart.reward_requested};
}
