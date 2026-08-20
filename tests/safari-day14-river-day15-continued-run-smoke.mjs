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

const LOW_ITEMS = new Set([
  "POTION", "ANTIDOTE", "PARALYZEHEAL", "AWAKENING", "BURNHEAL", "ICEHEAL",
  "POKEBALL", "ORANBERRY", "PECHABERRY", "CHERIBERRY", "FRESHWATER", "SODAPOP",
]);

const stateOf = (runtime) => runtime.variables.mapless;
const moveId = (move) => typeof move === "string" ? move : move?.id;
const partyIdentity = (runtime) => runtime.player.party.map((pokemon, index) =>
  pokemon?.personal_id ?? pokemon?.id ?? pokemon?.uuid ?? `${pokemon?.species}:${index}`);
const lowItemTotal = (runtime) => (runtime.bag?.slots ?? []).reduce((sum, slot) =>
  sum + (slot && LOW_ITEMS.has(slot[0]) ? Number(slot[1] ?? 0) : 0), 0);

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
original.bag.slots = [["POTION", 1]];
const originalIdentity = partyIdentity(original);
web.saveSafariPlayableRun(storage, original);

const loaded = web.loadSafariPlayableRun(storage, web.createSafariPlayableRuntime());
assert.equal(loaded.found, true, "DAY15 continuation must begin from a fresh Continue load");
const runtime = loaded.state;
const state = stateOf(runtime);
assert.deepEqual(partyIdentity(runtime), originalIdentity);
assert.equal(lowItemTotal(runtime), 1);

while (Number(state.day) < 9) {
  await advanceOrdinaryDay(runtime, Number(state.day) + 1);
}

// DAY 9 -> 10 boundary through the real camp/boundary owner.
const boundaryIndex = nextDayIndex(runtime);
const boundaryCamp = prepareSafariCampNextDay(runtime, boundaryIndex, true);
applySafariCampRecovery(runtime, boundaryCamp);
const boundaryEntry = applySafariBoundaryTrialEntry(runtime, boundaryCamp);
assert.equal(boundaryEntry.entered, true);
assert.equal(state.day, 10);
assert.equal(state.location, "boundary_trial");
startSafariBoundaryTrialBattle(runtime);
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
assert.equal(state.battle.completed, true);
const boundaryReturn = await web.returnSafariToDayBoard(runtime);
assert.equal(boundaryReturn.target, "day_board");
assert.equal(state.day, 11);
assert.deepEqual(partyIdentity(runtime), originalIdentity);

await advanceOrdinaryDay(runtime, 12);
await advanceOrdinaryDay(runtime, 13);

// Real DAY 13 shop transaction from the generated Board.
assert.deepEqual(state.board_events.map((entry) => entry?.kind),
  ["type_event", "miner", "wild", "tavern", "shop", "trainer", "next_day", "buried_item"]);
const shopIndex = state.board_events.findIndex((entry) => entry?.kind === "shop");
const shopOpened = await web.activateSafariDayBoardCell(runtime, shopIndex);
assert.equal(shopOpened.result, "shop_opened");
const shop = web.safariShopPresentation(runtime);
const affordable = shop.items.find((item) =>
  item?.transaction_kind === "buy" && Number(item.price) > 0 && Number(item.price) <= Number(shop.money));
assert.ok(affordable);
const purchase = await web.purchaseSafariShopItem(runtime, {
  itemId: affordable.id,
  quantity: 1,
  confirmed: true,
});
assert.equal(purchase.result, "bought");
const bagAfterShop = structuredClone(runtime.bag);

await advanceOrdinaryDay(runtime, 14);
assert.deepEqual(state.board_events.map((entry) => entry?.kind),
  ["next_day", "wild", "normal_event", "egg_shop", "treasure", "shop", "trainer", "type_event"]);
assert.deepEqual(runtime.bag, bagAfterShop, "DAY14 must retain the real DAY13 shop transaction");

// The generated DAY14 normal-event is the canonical flooded_river. Resolve it through
// the live Safari Board click path, choosing the same force action a real confirm click uses.
const riverIndex = state.board_events.findIndex((entry) => entry?.kind === "normal_event");
assert.ok(riverIndex >= 0);
assert.equal(state.board_events[riverIndex].normal_event_id, "flooded_river");
const hpBeforeRiver = runtime.player.party.map((pokemon) => ({
  hp: Number(pokemon.hp), maxHp: Number(pokemon.max_hp), egg: pokemon?.egg === true,
}));
const lowBeforeRiver = lowItemTotal(runtime);
assert.ok(lowBeforeRiver >= 1, "continued run must carry at least one canonical LOW_ITEM into DAY14");
const previousConfirm = globalThis.confirm;
globalThis.confirm = () => true;
const river = await web.activateSafariDayBoardCell(runtime, riverIndex);
if (previousConfirm === undefined) delete globalThis.confirm;
else globalThis.confirm = previousConfirm;

assert.equal(river.result, "force_major_damage_item_lost");
assert.equal(state.board_events[riverIndex].normal_data.force_roll, 98);
assert.equal(state.board_consumed[riverIndex], true);
assert.equal(state.board_visited[riverIndex], true);
assert.equal(lowItemTotal(runtime), lowBeforeRiver - 1,
  "DAY14 roll 98 must lose exactly one owned canonical LOW_ITEM");
runtime.player.party.forEach((pokemon, index) => {
  const before = hpBeforeRiver[index];
  if (before.egg || before.hp <= 0) return;
  const expectedDamage = Math.max(1, Math.ceil(before.maxHp * 20 / 100));
  assert.equal(Number(pokemon.hp), Math.max(1, before.hp - expectedDamage),
    "DAY14 river must apply canonical 20% max-HP damage with minimum HP 1");
});
const bagAfterRiver = structuredClone(runtime.bag);

// Camp recovery may heal HP, but the river's Bag mutation and Party identity must survive
// the same run's transition onto the next real canonical Board.
await advanceOrdinaryDay(runtime, 15);
assert.deepEqual(partyIdentity(runtime), originalIdentity, "DAY15 must retain the same Pokemon identities");
assert.deepEqual(runtime.bag, bagAfterRiver, "DAY15 must retain the DAY14 river item loss");
assert.deepEqual(state.board_events.map((entry) => entry?.kind),
  ["delta_exchange", "next_day", "type_event", "house", "wild", "miner", "wild", "trainer"],
  "DAY15 must be the next deterministic canonical weighted Board");
assert.equal(state.location, "day_board");
assert.equal(state.battle, null);

console.log("Safari Continue -> boundary -> DAY13 shop -> DAY14 flooded river -> DAY15 canonical Board: PASS");
