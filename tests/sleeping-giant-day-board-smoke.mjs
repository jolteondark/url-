import assert from 'node:assert/strict';
import { resolveDayBoardSleepingGiantSlice } from '../runtime/mapless-day-board-sleeping-giant.js';

const base={index:0,board_events:[{kind:'normal_event',normal_event_id:'sleeping_giant',normal_seed:9,normal_data:{steal_roll:90,type:'NORMAL',boost_stat:'ATTACK',display_item:'NUGGET'}}],board_visited:[false],board_revealed:[false],board_consumed:[false],pending_hatches:['EGG1'],autosave_defined:true,event_stage_active:true,scene_same:true};
const fight=resolveDayBoardSleepingGiantSlice({...base,choice:0,battle_success:true});
assert.equal(fight.result,true);
assert.equal(fight.event_result.battle_requested,true);
assert.equal(fight.event_result.reward_requested,true);
assert.deepEqual(fight.battle.enemy_stages,{ATTACK:1});
assert.equal(fight.operations.some(x=>x.op==='request_grant_items'&&x.items[0]==='NUGGET'),true);
assert.equal(fight.state.board_consumed[0],true);
const steal=resolveDayBoardSleepingGiantSlice({...base,board_visited:[false],board_revealed:[false],board_consumed:[false],normal_data:{...base.board_events[0].normal_data,steal_roll:20},choice:0});
assert.equal(steal.event_result.battle_requested,false);
assert.equal(steal.event_result.reward_requested,true);
console.log(JSON.stringify({ok:true,fight:fight.event_result,steal:steal.event_result}));
await import('./safari-camp-next-day-single-input-smoke.mjs');
