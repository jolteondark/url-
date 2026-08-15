import assert from "node:assert/strict";
import {
  activateSafariDayBoardCell,
  attemptSafariCapture,
  boardCellPresentation,
  createSafariPlayableRuntime,
  leaveSafariShop,
  loadSafariPlayableRun,
  purchaseSafariShopItem,
  resolveSafariBattleRound,
  returnSafariToDayBoard,
  safariShopPresentation,
  saveSafariPlayableRun,
} from "../runtime/safari-playable-integration.js";
import { createPokemonRuntime } from "../runtime/pokemon-runtime.js";
import { resolveBattleRuntimeIntegration } from "../runtime/battle-runtime-integration.js";

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function state(runtime) {
  return runtime.variables.mapless;
}

const wholeBattle = resolveBattleRuntimeIntegration({
  pokemon: createPokemonRuntime({ species: "RATTATA", level: 5, hp: 20, max_hp: 20, moves: [] }),
  allowIncompleteBattle: false,
  battleInput: {
    useCanonicalAccuracyDamage: true,
    rounds: [{
      priorityOrder: [0],
      actions: [{ kind: "move", accuracyHit: true, calculatedDamage: 7, hpBefore: 7, totalHp: 7, fainted: true, judgeState: { foeAllFainted: true } }],
    }],
  },
});
assert.equal(wholeBattle.turn.decision, 1);
assert.equal(wholeBattle.turn.aborted, false);
assert.equal(wholeBattle.turn.operations.at(-1).op, "end_of_battle");

const incrementalEndOfRound = resolveBattleRuntimeIntegration({
  pokemon: createPokemonRuntime({ species: "RATTATA", level: 5, hp: 20, max_hp: 20, moves: [] }),
  sendOuts: [[0, "RATTATA"]],
  battleInput: {
    useCanonicalAccuracyDamage: true,
    rounds: [{ actions: [], priorityOrder: [], endOfRoundInput: { priority: [1, 0], positions: [0, 1] } }],
  },
  allowIncompleteBattle: true,
});
assert.equal(incrementalEndOfRound.turn.decision, 0);
assert.equal(incrementalEndOfRound.turn.awaitingNextRound, true);
assert.ok(incrementalEndOfRound.turn.operations.some((operation) => operation.op === "end_weather_request" && operation.round === 1));
assert.ok(incrementalEndOfRound.turn.operations.some((operation) => operation.op === "eor_switch_request" && operation.round === 1));
assert.ok(incrementalEndOfRound.turn.operations.some((operation) => operation.op === "end_of_round_complete" && operation.round === 1));
assert.ok(!incrementalEndOfRound.turn.operations.some((operation) => operation.op === "end_of_battle"));
assert.deepEqual(incrementalEndOfRound.combatTrace.rounds[0].endOfRoundInput.priority, [1, 0]);
assert.equal(incrementalEndOfRound.pokemon.hp, 20);

let shopRuntime = createSafariPlayableRuntime();
const shopIndex = state(shopRuntime).board_events.findIndex((event) => event.kind === "shop");
assert.equal(shopRuntime.bag.money, 1000);
const shopOpened = activateSafariDayBoardCell(shopRuntime, shopIndex);
assert.equal(shopOpened.result, "shop_opened");
assert.equal(shopOpened.turn_result, "completed");
assert.equal(state(shopRuntime).board_consumed[shopIndex], false);
assert.deepEqual(safariShopPresentation(shopRuntime), {
  facilityId: "normal_shop",
  boardIndex: shopIndex,
  money: 1000,
  lastTransactionResult: null,
  items: [{ id: "POTION", name: "Potion", label: "キズぐすり", pocket: "MEDICINE", price: 200, sell_price: 50, quantity: 0 }],
});
const cancelledPurchase = purchaseSafariShopItem(shopRuntime, { itemId: "POTION", quantity: 2, confirmed: false });
assert.equal(cancelledPurchase.result, false);
assert.equal(cancelledPurchase.transaction_result, "cancelled");
assert.equal(shopRuntime.bag.money, 1000);
assert.deepEqual(shopRuntime.bag.slots, []);
assert.ok(state(shopRuntime).shop);
const purchased = purchaseSafariShopItem(shopRuntime, { itemId: "POTION", quantity: 2, confirmed: true });
assert.equal(purchased.result, true);
assert.equal(purchased.phase, "return_to_village");
assert.equal(purchased.transaction_result, "bought");
assert.deepEqual(shopRuntime.bag.slots, [["POTION", 2]]);
assert.equal(shopRuntime.bag.money, 600);
assert.equal(state(shopRuntime).shop, null);
assert.ok(purchased.operations.some((operation) => operation.op === "request_consume_village_action"));
assert.ok(purchased.operations.some((operation) => operation.op === "request_save"));

const shopStorage = new MemoryStorage();
saveSafariPlayableRun(shopStorage, shopRuntime);
shopRuntime.bag.money = 0;
shopRuntime.bag.slots = [];
shopRuntime = loadSafariPlayableRun(shopStorage, shopRuntime).state;
assert.equal(shopRuntime.bag.money, 600);
assert.deepEqual(shopRuntime.bag.slots, [["POTION", 2]]);

const poorRuntime = createSafariPlayableRuntime();
poorRuntime.bag.money = 100;
activateSafariDayBoardCell(poorRuntime, state(poorRuntime).board_events.findIndex((event) => event.kind === "shop"));
const rejected = purchaseSafariShopItem(poorRuntime, { itemId: "POTION", quantity: 1, confirmed: true });
assert.equal(rejected.result, false);
assert.equal(rejected.transaction_result, "not_enough_money");
assert.equal(poorRuntime.bag.money, 100);
assert.deepEqual(poorRuntime.bag.slots, []);
assert.ok(state(poorRuntime).shop);
assert.equal(leaveSafariShop(poorRuntime).result, "returned");
assert.equal(state(poorRuntime).shop, null);

let runtime = createSafariPlayableRuntime();
assert.equal(state(runtime).day, 1);
assert.equal(state(runtime).board_events.length, 8);
assert.equal(state(runtime).board_events.filter((event) => event.kind === "next_day").length, 1);
assert.ok(Array.from({ length: 8 }, (_, index) => boardCellPresentation(runtime, index)).every((cell) => cell.label === "？？？"));

const firstWild = state(runtime).board_events.findIndex((event) => event.kind === "wild");
const started = activateSafariDayBoardCell(runtime, firstWild);
assert.equal(started.result, "dispatched");
assert.equal(state(runtime).battle.kind, "wild");
assert.equal(state(runtime).board_revealed[firstWild], true);
assert.equal(state(runtime).board_consumed[firstWild], false);
assert.equal("species_id" in state(runtime).board_events[firstWild], false);
assert.deepEqual(state(runtime).battle.encounter_request, {
  required_type: "BUG",
  day: 1,
  enemy_rank: "NORMAL",
  extra_modifier: 0,
  use_variance: true,
});
assert.equal(state(runtime).battle.encounter.source, "generated_browser_projection");
assert.equal(typeof state(runtime).battle.encounter.species_id, "string");
assert.equal(state(runtime).battle.foe.species, state(runtime).battle.encounter.species_id);
assert.equal(state(runtime).battle.encounter.level, 3);
assert.ok(started.operations.some((operation) => operation.op === "create_general_type_encounter"));
assert.ok(started.operations.some((operation) => operation.op === "start_wild_battle"));
assert.deepEqual(state(runtime).battle.encounter_cleanup, [{ op: "clear_battle_rules" }]);

const continuationRuntime = structuredClone(runtime);
continuationRuntime.player.party[0].hp = continuationRuntime.player.party[0].max_hp;
continuationRuntime.variables.mapless.battle.foe.hp = continuationRuntime.variables.mapless.battle.foe.max_hp;
const continuationRound = resolveSafariBattleRound(continuationRuntime, "TACKLE");
assert.equal(continuationRound.decision, 0);
assert.equal(state(continuationRuntime).battle.completed, false);
assert.ok(continuationRound.operations.every((operation) => operation.op !== "end_of_battle"));
assert.ok(continuationRound.operations.some((operation) => operation.op === "calculate_priority" && operation.resolvedAdapter));

let lastRound;
for (let turn = 0; turn < 10 && !state(runtime).battle.completed; turn += 1) {
  lastRound = resolveSafariBattleRound(runtime, "TACKLE");
}
assert.equal(state(runtime).battle.decision, 1);
assert.equal(state(runtime).board_consumed[firstWild], true);
assert.equal(runtime.player.party[0].level, 9);
assert.ok(runtime.player.party[0].exp > 0);
assert.ok(runtime.player.party[0].moves.length > 0);
assert.ok(runtime.player.party[0].moves.find((move) => move.id === "TACKLE").pp < 35);
assert.ok(Number.isInteger(state(runtime).battle.foe.moves[0].pp));
assert.ok(state(runtime).battle.foe.moves[0].pp >= 0);
assert.deepEqual(runtime.bag.slots, [["POTION", 1]]);
const completedWildActivation = state(runtime).last_operations.find((operation) => operation.op === "activate_wild_cell")?.resolved;
assert.ok(completedWildActivation);
assert.deepEqual(
  completedWildActivation.operations.filter((operation) => operation.op === "clear_battle_rules"),
  state(runtime).battle.encounter_cleanup,
);
assert.ok(lastRound.operations.some((operation) => operation.op === "calc_damage"));
assert.deepEqual(lastRound.ppIntegration.commits.map((commit) => commit.actor), ["player"]);
assert.ok(lastRound.operations.some((operation) => operation.op === "end_of_battle"));
assert.ok(lastRound.presentation.some((event) => event.type === "damage_applied"));
assert.ok(lastRound.presentation.some((event) => event.type === "battle_result"));

returnSafariToDayBoard(runtime);
assert.equal(state(runtime).battle, null);

const secondWild = state(runtime).board_events.findIndex((event, index) => event.kind === "wild" && index !== firstWild);
activateSafariDayBoardCell(runtime, secondWild);
const captured = attemptSafariCapture(runtime);
assert.equal(captured.result, "caught");
assert.equal(captured.destination, "party");
assert.equal(captured.calculation.numShakes, 4);
assert.equal(captured.calculation.randomUsed, 4);
assert.ok(captured.calculation.x < 255);
assert.equal(runtime.player.party.length, 2);
assert.equal(state(runtime).board_consumed[secondWild], true);
returnSafariToDayBoard(runtime);

const storage = new MemoryStorage();
const saved = saveSafariPlayableRun(storage, runtime);
assert.ok(saved.operations.some((operation) => operation.op === "storage_set"));
runtime.variables.mapless.day = 99;
const loaded = loadSafariPlayableRun(storage, runtime);
assert.equal(loaded.found, true);
runtime = loaded.state;
assert.equal(state(runtime).day, 1);
assert.equal(runtime.player.party.length, 2);
assert.ok(runtime.player.party[0].moves.find((move) => move.id === "TACKLE").pp < 35);

const nextDay = state(runtime).board_events.findIndex((event) => event.kind === "next_day");
const advanced = activateSafariDayBoardCell(runtime, nextDay);
assert.equal(advanced.result, "day_advanced");
assert.equal(state(runtime).day, 2);
assert.equal(state(runtime).board_events.length, 8);
assert.ok(state(runtime).board_revealed.every((value) => value === false));

while (runtime.player.party.length < 6) runtime.player.party.push(structuredClone(runtime.player.party[0]));
const dayTwoWild = state(runtime).board_events.findIndex((event) => event.kind === "wild");
activateSafariDayBoardCell(runtime, dayTwoWild);
const boxed = attemptSafariCapture(runtime);
assert.equal(boxed.destination, "box");
assert.equal(runtime.player.party.length, 6);
assert.equal(runtime.storage_system.boxes[0].slots.filter(Boolean).length, 1);

console.log(JSON.stringify({
  day: state(runtime).day,
  party: runtime.player.party.length,
  boxed: runtime.storage_system.boxes[0].slots.filter(Boolean).length,
  potion: runtime.bag.slots[0][1],
  shop: "m0289_purchase_money_bag_persistence_return",
  vertical: "day_board_shop_battle_result_persistence_return",
}));
