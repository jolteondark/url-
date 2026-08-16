import assert from 'node:assert/strict';
import { resolveItemCollector } from '../runtime/mapless-item-collector-flow.js';
import { resolveFakeNurse } from '../runtime/mapless-fake-nurse-flow.js';
import { resolveEvolutionLab } from '../runtime/mapless-evolution-lab-flow.js';

const collector = resolveItemCollector({
  event:{}, choice:'ball', entries:[{id:'POKEBALL',qty:2,grade:0}],
  grade_candidates:[['POKEBALL','GREATBALL'],['ULTRABALL']], selected_item:'POKEBALL',
  upgrade_roll:10, reward_index:0, can_add_result:true, remove_item_result:true, grant_item_result:true,
});
assert.equal(collector.result,true);
assert.equal(collector.outcome,'exchanged');
assert.equal(collector.operations.some(x=>x.op==='select_reward'&&x.item==='ULTRABALL'),true);

const rollback = resolveItemCollector({
  event:{}, choice:'medicine', entries:[{id:'POTION',qty:1,grade:0}],
  grade_candidates:[['POTION','ANTIDOTE']], selected_item:'POTION', upgrade_roll:100,
  can_add_result:true, remove_item_result:true, grant_item_result:false,
});
assert.equal(rollback.result,false);
assert.equal(rollback.outcome,'grant_failed_rolled_back');
assert.equal(rollback.operations.some(x=>x.op==='rollback_add_item'&&x.item==='POTION'),true);

const fake = resolveFakeNurse({
  event:{normal_seed:9,normal_data:{fake:true,id_roll:70}}, scaling_value:2,
  has_dark_or_psychic:true, choice:'check_id', battle_result:1, battle_success:true,
});
assert.equal(fake.result,true);
assert.equal(fake.warned,true);
assert.equal(fake.normal_price,700);
assert.equal(fake.outcome,'fake_id_battle_won');
assert.equal(fake.operations.some(x=>x.op==='start_trainer_battle_request'),true);

const lab = resolveEvolutionLab({
  event:{}, choice:'maximum', candidates:[{party_index:1,species:'EEVEE',evolution_choices:['VAPOREON','JOLTEON']}],
  selected_party_index:1, selected_evolution:'JOLTEON', roll:96,
});
assert.equal(lab.result,true);
assert.equal(lab.outcome,'maximum_level_down_3');
assert.deepEqual(lab.operations.find(x=>x.op==='lower_level'),{op:'lower_level',party_index:1,amount:3,minimum_level:1});

console.log(JSON.stringify({ok:true,collector:collector.outcome,rollback:rollback.outcome,fake:fake.outcome,lab:lab.outcome}));
