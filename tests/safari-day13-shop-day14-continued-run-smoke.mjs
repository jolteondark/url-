import assert from "node:assert/strict";
import {
  applySafariBoundaryTrialEntry,
  applySafariCampRecovery,
  prepareSafariCampNextDay,
} from "../runtime/safari-camp-next-day-command.js";
import { startSafariBoundaryTrialBattle } from "../runtime/safari-boundary-trial-start.js";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const stateOf = (runtime) => runtime.variables.mapless;
const moveId = (move) => typeof move === "string" ? move : move?.id;
const partyIdentity = (runtime) => runtime.player.party.map((pokemon, index) =>
  pokemon?.personal_id ?? pokemon?.id ?? pokemon?.uuid ?? `${pokemon?.species}:${index}`);

function nextDayIndex(runtime) {
  const index = stateOf(runtime).board_events.findIndex((entry) => entry?.kind === "next_day");
  assert.ok(index >= 0, "canonical generated Board must retain one next_day cell");
  return index;
}

async function advanceOrdinaryDay(runtime, expectedDay) {
  const state = stateOf(runtime);
  const index = nextDayIndex(runtime);
  const camp = prepareSafariCampNextDay(runtime, index, true);
  applySafariCampRecovery(runtime, camp);
  const boundary = applySafariBoundaryTrialEntry(runtime, camp);
  assert.equal(boundary.entered, false, `DAY ${expectedDay} must be an ordinary Board floor`);
  const advanced = await web.activateSafariDayBoardCell(runtime, index);
  assert.equal(advanced.result, "day_advanced");
  assert.equal(state.day, expectedDay);
  assert.equal(state.location, "day_board");
  assert.deepEqual(state.board_revealed, Array(8).fill(false));
  assert.deepEqual(state.board_consumed, Array(8).fill(false));
  assert.deepEqual(state.board_visited, Array(8).fill(false));
}

const storage = new MemoryStorage();
const original = web.createSafariPlayableRuntime();
original.bag.money = 10000;
const originalIdentity = partyIdentity(original);
web.saveSafariPlayableRun(storage, original);

const loaded = web.loadSafariPlayableRun(storage, web.createSafariPlayableRuntime());
assert.equal(loaded.found, true, "continued-run vertical must begin from a fresh Continue load");
const runtime = loaded.state;
const state = stateOf(runtime);
assert.deepEqual(partyIdentity(runtime), originalIdentity);
assert.equal(runtime.bag.money, 10000);

while (Number(state.day) < 9) {
  await advanceOrdinaryDay(runtime, Number(state.day) + 1);
  assert.deepEqual(partyIdentity(runtime), originalIdentity, "ordinary day progression must retain Party identity");
}

// DAY 9 -> 10 uses the existing camp/boundary owner rather than generating a normal DAY 10 Board.
assert.equal(state.day, 9);
const boundaryIndex = nextDayIndex(runtime);
const boundaryCamp = prepareSafariCampNextDay(runtime, boundaryIndex, true);
applySafariCampRecovery(runtime, boundaryCamp);
const boundaryEntry = applySafariBoundaryTrialEntry(runtime, boundaryCamp);
assert.equal(boundaryEntry.entered, true);
assert.equal(state.day, 10);
assert.equal(state.location, "boundary_trial");
assert.ok(state.boundary_trial?.pending_leader);
assert.equal(state.battle, null);

const leader = state.boundary_trial.pending_leader;
startSafariBoundaryTrialBattle(runtime);
assert.equal(state.battle?.origin, "boundary_trial");
for (let safety = 0; !state.battle.completed && safety < 5; safety += 1) {
  const battle = state.battle;
  const foeIndex = Number(battle.trainer_party_index ?? 0);
  battle.foe.hp = 1;
  battle.foe.fainted = false;
  battle.trainer_party[foeIndex].hp = 1;
  battle.trainer_party[foeIndex].fainted = false;
  const playerIndex = Number(battle.player_party_index ?? 0);
  const player = runtime.player.party[playerIndex];
  player.hp = player.max_hp;
  player.stats.ATTACK = 9999;
  player.stats.SPEED = 9999;
  await web.resolveSafariBattleRound(runtime, moveId(player.moves[0]));
}
assert.equal(state.battle.completed, true, "continued run must clear the existing boundary trainer owner");
assert.equal(state.battle.decision, 1);
assert.equal(state.boundary_trial.last_leader, leader);

const boundaryReturn = await web.returnSafariToDayBoard(runtime);
assert.equal(boundaryReturn.target, "day_board");
assert.equal(state.day, 11);
assert.equal(state.location, "day_board");
assert.equal(state.battle, null);
assert.deepEqual(partyIdentity(runtime), originalIdentity, "boundary victory must retain Party identity");

await advanceOrdinaryDay(runtime, 12);
await advanceOrdinaryDay(runtime, 13);
assert.deepEqual(partyIdentity(runtime), originalIdentity, "post-boundary day progression must retain Party identity");

// Consume a real canonical DAY 13 shop cell. The Board is generated by the v0.9.108 weighted owner;
// this test does not replace or inject any DAY 13 event.
const day13Kinds = state.board_events.map((entry) => entry?.kind);
assert.deepEqual(day13Kinds, ["type_event", "miner", "wild", "tavern", "shop", "trainer", "next_day", "buried_item"],
  "DAY 13 must retain the deterministic canonical weighted Board composition");
const shopIndex = state.board_events.findIndex((entry) => entry?.kind === "shop");
assert.ok(shopIndex >= 0);
const shopOpened = await web.activateSafariDayBoardCell(runtime, shopIndex);
assert.equal(shopOpened.result, "shop_opened");
assert.equal(state.board_revealed[shopIndex], true);

const shop = web.safariShopPresentation(runtime);
assert.ok(shop, "real DAY 13 shop must expose the canonical shop presentation");
const affordable = shop.items.find((item) =>
  item?.transaction_kind === "buy" && Number(item.price) > 0 && Number(item.price) <= Number(shop.money));
assert.ok(affordable, "continued run must have at least one affordable canonical DAY 13 shop item");

const moneyBefore = Number(runtime.bag.money);
const quantityBefore = Number(affordable.quantity ?? 0);
const purchase = await web.purchaseSafariShopItem(runtime, {
  itemId: affordable.id,
  quantity: 1,
  confirmed: true,
});
assert.equal(purchase.result, "bought");
assert.equal(Number(runtime.bag.money), moneyBefore - Number(affordable.price));
assert.equal(state.shop, null, "successful canonical shop purchase must close the active shop owner");
const purchasedSlot = runtime.bag.slots.find((slot) => slot?.[0] === affordable.id);
assert.equal(Number(purchasedSlot?.[1] ?? 0), quantityBefore + 1,
  "DAY 13 shop purchase must persist in the same Bag owner");
const bagAfterShop = structuredClone(runtime.bag);

await advanceOrdinaryDay(runtime, 14);
assert.deepEqual(partyIdentity(runtime), originalIdentity, "DAY 14 transition must retain Party identity");
assert.deepEqual(runtime.bag, bagAfterShop, "DAY 14 transition must retain the DAY 13 shop transaction");
assert.deepEqual(state.board_events.map((entry) => entry?.kind),
  ["next_day", "wild", "normal_event", "egg_shop", "treasure", "shop", "trainer", "type_event"],
  "DAY 14 must be the next deterministic canonical weighted Board");
assert.equal(state.board_events.some((entry) => entry?.kind === "normal_event"), true,
  "continued run must reach a DAY 14 Board containing a real canonical normal-event slot");

console.log("Safari Continue -> DAY10 boundary -> DAY13 real shop -> Bag/Money -> DAY14 canonical Board: PASS");
