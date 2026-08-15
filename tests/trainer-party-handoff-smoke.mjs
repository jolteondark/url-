import assert from "node:assert/strict";
import {
  activateSafariDayBoardCell,
  createSafariPlayableRuntime,
  resolveSafariBattleRound,
} from "../runtime/safari-playable-integration.js";

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
const trainerIndex = state.board_events.findIndex((event) => event.kind === "trainer");
assert.ok(trainerIndex >= 0);

const started = activateSafariDayBoardCell(runtime, trainerIndex);
assert.equal(started.result, "dispatched");
assert.equal(state.battle.kind, "trainer");
assert.ok(state.battle.trainer);
assert.ok(state.battle.prize_money > 0);

// Force the generated battle through the 2-member path deterministically.
const first = structuredClone(state.battle.foe);
const second = structuredClone(state.battle.foe);
first.hp = 1;
second.hp = 1;
state.battle.foe = first;
state.battle.trainer_party = [first, second];
state.battle.trainer_party_index = 0;
const moneyBefore = runtime.bag.money;

const firstRound = resolveSafariBattleRound(runtime, "TACKLE");
assert.equal(firstRound.decision, 0);
assert.equal(state.battle.completed, false);
assert.equal(state.battle.trainer_party_index, 1);
assert.equal(state.battle.foe.hp, 1);
assert.ok(state.battle.trainer_exp_gained >= 0);
assert.equal(runtime.bag.money, moneyBefore);
assert.ok(state.battle.presentation.some((event) => event.type === "trainer_next"));

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
  trainer: state.battle.trainer.trainer_full_name,
  partyIndex: state.battle.trainer_party_index,
  moneyGained: state.battle.money_gained,
  expGained: state.battle.exp_gained,
}));
