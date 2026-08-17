import assert from "node:assert/strict";
import { MAPLESS_DYNAMIC_TRAINER_PARTY_SIZE, MAPLESS_DYNAMIC_TRAINER_MASTER_VERSION } from "../runtime/mapless-dynamic-trainer-master.js";
import { generateSafariDynamicTrainer } from "../runtime/mapless-dynamic-trainer-generator.js";
import {
  activateSafariDayBoardCell,
  createSafariPlayableRuntime,
  resolveSafariBattleRound,
} from "../runtime/safari-playable-integration.js";

assert.equal(MAPLESS_DYNAMIC_TRAINER_MASTER_VERSION, "0.1.3");
assert.deepEqual(MAPLESS_DYNAMIC_TRAINER_PARTY_SIZE, { minimum: 1, maximum: 3 });
const generatedThree = generateSafariDynamicTrainer({ day: 1, partySize: 3, randomValues: [0, 0, 0, 1, 2, 1, 1, 1] });
assert.equal(generatedThree.party_size, 3);
assert.equal(generatedThree.party.length, 3);
assert.equal(new Set(generatedThree.species_ids).size, 3);
assert.ok(generatedThree.party.every((pokemon) => pokemon.move_ids.length >= 1 && pokemon.move_ids.length <= 4));

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
const trainerIndex = state.board_events.findIndex((event) => event.kind === "trainer");
assert.ok(trainerIndex >= 0);
const started = activateSafariDayBoardCell(runtime, trainerIndex);
assert.equal(started.result, "dispatched");
assert.equal(state.battle.kind, "trainer");
assert.ok(state.battle.trainer);
assert.ok(state.battle.prize_money > 0);

// Force the battle through the canonical maximum 3-member path deterministically.
const first = structuredClone(state.battle.foe);
const second = structuredClone(state.battle.foe);
const third = structuredClone(state.battle.foe);
first.hp = 1; second.hp = 1; third.hp = 1;
state.battle.foe = first;
state.battle.trainer_party = [first, second, third];
state.battle.trainer_party_index = 0;
const moneyBefore = runtime.bag.money;

const firstRound = resolveSafariBattleRound(runtime, "TACKLE");
assert.equal(firstRound.decision, 0);
assert.equal(state.battle.completed, false);
assert.equal(state.battle.trainer_party_index, 1);
assert.equal(runtime.bag.money, moneyBefore);
assert.ok(state.battle.presentation.some((event) => event.type === "trainer_next"));
assert.ok(firstRound.operations.some((operation) => operation.op === "send_out" && operation.source === "trainer_replacement_continuation"));

const secondRound = resolveSafariBattleRound(runtime, "TACKLE");
assert.equal(secondRound.decision, 0);
assert.equal(state.battle.completed, false);
assert.equal(state.battle.trainer_party_index, 2);
assert.equal(runtime.bag.money, moneyBefore);
assert.ok(state.battle.presentation.some((event) => event.type === "trainer_next"));
assert.ok(secondRound.operations.some((operation) => operation.op === "send_out" && operation.source === "trainer_replacement_continuation"));

const finalRound = resolveSafariBattleRound(runtime, "TACKLE");
assert.equal(finalRound.decision, 1);
assert.equal(state.battle.completed, true);
assert.equal(state.battle.trainer_prize_paid, true);
assert.ok(state.battle.money_gained > 0);
assert.equal(runtime.bag.money, moneyBefore + state.battle.money_gained);
assert.ok(state.notice.includes("賞金"));
const resultEvent = state.battle.presentation.find((event) => event.type === "battle_result");
assert.equal(resultEvent.moneyGained, state.battle.money_gained);

console.log(JSON.stringify({
  ok: true,
  masterVersion: MAPLESS_DYNAMIC_TRAINER_MASTER_VERSION,
  maxParty: MAPLESS_DYNAMIC_TRAINER_PARTY_SIZE.maximum,
  generatedSpecies: generatedThree.species_ids,
  partyIndex: state.battle.trainer_party_index,
  moneyGained: state.battle.money_gained,
  expGained: state.battle.exp_gained,
}));
