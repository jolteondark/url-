import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { inspectExtractedShowdownArtifact } from '../scripts/showdown-browser-artifact-contract.mjs';
import { loadShowdownBrowserArtifact, REQUIRED_SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-browser-artifact.js';
import { createP1PlayableController } from '../src-next/platform/p1-playable-controller.js';

const extractorDir = process.argv[2];
if (!extractorDir) {
  console.error('usage: node tests/reconstruction-showdown-real-p1-vertical.mjs <built-pinned-pkmn-ps-checkout>');
  process.exit(2);
}

const artifact = inspectExtractedShowdownArtifact(resolve(extractorDir));
assert.equal(artifact.showdownRevision, REQUIRED_SHOWDOWN_REVISION);
const showdown = await loadShowdownBrowserArtifact(artifact);
assert.equal(showdown.revision, REQUIRED_SHOWDOWN_REVISION);

function memoryStorage(backing = new Map()) {
  return {
    getItem(key) { return backing.has(key) ? backing.get(key) : null; },
    setItem(key, value) { backing.set(key, String(value)); },
    removeItem(key) { backing.delete(key); },
  };
}

const backing = new Map();
const controller = createP1PlayableController({
  showdown,
  storage: memoryStorage(backing),
});

controller.freshStart({ runId: 'real-showdown-p1-vertical', seed: 108 });
let state = controller.snapshot();
assert.equal(state.money, 1000);
assert.equal(state.party[0].species, 'Eevee');
assert.equal(state.party[0].level, 9);
assert.equal(state.party[0].maxhp, 28);

const wildSlot = state.board.findIndex((slot) => slot.kind === 'wild');
assert.equal(wildSlot, 2, 'seed 108 first canonical Board wild slot');
assert.equal(state.board[wildSlot].type, 'BUG');

const prepared = await controller.prepareWild(wildSlot);
state = controller.snapshot();
const encounter = state.board[wildSlot].encounter;
assert.equal(encounter.type, 'BUG');
assert.ok(encounter.species);
assert.ok(Number.isInteger(encounter.level) && encounter.level >= 1);
assert.ok(Number.isInteger(encounter.baseExp) && encounter.baseExp >= 0);
assert.ok(encounter.pokemon?.moves?.length > 0);
assert.equal(encounter.pokemon.hp, encounter.pokemon.maxhp);
assert.deepEqual(encounter.pokemon.iv, { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 });
assert.deepEqual(encounter.pokemon.ev, { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 });
assert.equal(prepared.prepared.encounter.species, encounter.species);

const started = await controller.startWildBattle(wildSlot);
assert.equal(started.resolved.terminal, false);
assert.equal(started.resolved.p1[0].maxhp, 28, 'canonical Fresh Start Eevee must preserve Mapless max HP in real Showdown');
assert.equal(started.resolved.p2[0].maxhp, encounter.pokemon.maxhp, 'generated wild max HP must match real Showdown');
assert.equal(started.seed.length, 4);

let turns = 0;
let fight = null;
while (turns < 20) {
  fight = await controller.fight(1);
  turns += 1;
  if (fight.terminal) break;
}
assert.ok(fight?.terminal, 'canonical Fresh Start wild battle must reach a terminal within 20 turns');
assert.equal(fight.outcome, 'win', 'Fresh Start Eevee must defeat the seeded Day 1 wild fixture');
assert.equal(fight.resolved.p2[0].fainted, true);
assert.ok(fight.resolved.p1[0].moves[0].pp < 35, 'real Showdown must consume Tackle PP');
assert.ok(fight.resolved.p1[0].hp > 0, 'winner must remain able to return to the Board');

state = controller.snapshot();
assert.equal(state.mode, 'battle_result');
assert.equal(state.board[wildSlot].consumed, true);
assert.equal(state.boardSelectionsRemaining, 7);
assert.equal(state.party[0].hp, fight.resolved.p1[0].hp);
assert.equal(state.party[0].moves[0].pp, fight.resolved.p1[0].moves[0].pp);
assert.equal(state.party[0].exp, 990, 'battle persistence must not invent growth rewards');

const pendingRewardId = state.pendingBattleResult.rewardId;
controller.commitReward(['1']);
state = controller.snapshot();
assert.equal(state.mode, 'board');
assert.equal(state.money, 1000, 'ordinary wild victory must not grant trainer prize money');
assert.ok(state.party[0].exp > 990, 'Mapless EXP must commit after the battle result');
assert.equal(state.bag.items.POTION, 1, 'ordinary wild victory must grant the canonical Potion');
assert.equal(state.party[0].moves[0].pp, fight.resolved.p1[0].moves[0].pp, 'reward must not overwrite Showdown-committed PP');
assert.equal(controller.hasSave(), true, 'reward commit must create the browser Continue checkpoint');

const afterReward = structuredClone(state);
assert.throws(
  () => controller.commitReward(['1']),
  /no pending battle reward/,
  'controller must not expose a second reward commit after the pending reward is consumed',
);
assert.deepEqual(controller.snapshot(), afterReward);

controller.advanceDay({ transitionId: 'real-showdown-p1:day-1-next', confirmed: true });
state = controller.snapshot();
assert.equal(state.day, 2);
assert.equal(state.mode, 'board');
assert.equal(state.board.length, 8);

const continued = createP1PlayableController({
  showdown,
  storage: memoryStorage(backing),
});
const loaded = continued.continueRun();
assert.equal(loaded.found, true);
assert.deepEqual(continued.snapshot(), state, 'fresh browser Continue must restore the exact settled P1 state');

const queuedTypes = controller.presentationQueue.jobs.map((job) => job.event.type);
for (const required of [
  'BATTLE_STARTED',
  'POKEMON_SENT_OUT',
  'MOVE_USED',
  'DAMAGE_APPLIED',
  'POKEMON_FAINTED',
  'BATTLE_WON',
  'EXP_GAINED',
  'ITEM_REWARDED',
]) {
  assert.ok(queuedTypes.includes(required), `real controller presentation queue missing ${required}`);
}

console.log(JSON.stringify({
  ok: true,
  showdownRevision: showdown.revision,
  wild: { species: encounter.species, level: encounter.level, baseExp: encounter.baseExp },
  showdownSeed: started.seed,
  turns,
  rewardId: pendingRewardId,
  day: state.day,
  money: state.money,
  potion: state.bag.items.POTION,
  starterExp: state.party[0].exp,
  starterHp: state.party[0].hp,
  starterPp: state.party[0].moves[0].pp,
  continueExact: true,
}, null, 2));
