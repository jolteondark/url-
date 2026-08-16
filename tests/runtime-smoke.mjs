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

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const state = (runtime) => runtime.variables.mapless;

// Canonical Day Board shop vertical: resolved type/stock -> presentation -> Bag/Money -> return.
let shopRuntime = createSafariPlayableRuntime();
const shopIndex = state(shopRuntime).board_events.findIndex((event) => event.kind === "shop");
assert.ok(shopIndex >= 0);
const shopEvent = state(shopRuntime).board_events[shopIndex];
assert.ok(shopEvent.canonical_shop);
assert.ok(shopEvent.canonical_shop.stock.length > 0);
shopRuntime.bag.money = 999999;
const shopOpened = activateSafariDayBoardCell(shopRuntime, shopIndex);
assert.equal(shopOpened.result, "shop_opened");
const shop = safariShopPresentation(shopRuntime);
assert.equal(shop.boardIndex, shopIndex);
assert.equal(shop.facilityId, shopEvent.shop_type);
assert.equal(shop.items.length, shopEvent.canonical_shop.stock.length);
assert.ok(shop.items.every((item) => Number.isInteger(item.price) && item.price >= 0));
const selected = shop.items[0];
const beforeMoney = shopRuntime.bag.money;
const purchased = purchaseSafariShopItem(shopRuntime, { itemId: selected.id, quantity: 1, confirmed: true });
assert.equal(purchased.result, "bought");
assert.equal(shopRuntime.bag.money, beforeMoney - selected.price);
assert.ok(shopRuntime.bag.slots.some((slot) => slot?.[0] === selected.id && slot[1] === 1));
assert.equal(state(shopRuntime).shop, null);

const shopStorage = new MemoryStorage();
saveSafariPlayableRun(shopStorage, shopRuntime);
shopRuntime.bag.money = 0;
shopRuntime.bag.slots = [];
shopRuntime = loadSafariPlayableRun(shopStorage, shopRuntime).state;
assert.equal(shopRuntime.bag.money, beforeMoney - selected.price);
assert.ok(shopRuntime.bag.slots.some((slot) => slot?.[0] === selected.id && slot[1] === 1));

const poorRuntime = createSafariPlayableRuntime();
const poorShopIndex = state(poorRuntime).board_events.findIndex((event) => event.kind === "shop");
activateSafariDayBoardCell(poorRuntime, poorShopIndex);
const poorShop = safariShopPresentation(poorRuntime);
poorRuntime.bag.money = 0;
const rejected = purchaseSafariShopItem(poorRuntime, { itemId: poorShop.items[0].id, quantity: 1, confirmed: true });
assert.equal(rejected.result, "not_enough_money");
assert.equal(poorRuntime.bag.money, 0);
assert.ok(state(poorRuntime).shop);
assert.equal(leaveSafariShop(poorRuntime).result, "returned");
assert.equal(state(poorRuntime).shop, null);

// Wild battle vertical remains connected after shop expansion.
let runtime = createSafariPlayableRuntime();
assert.equal(state(runtime).day, 1);
assert.equal(state(runtime).board_events.length, 8);
assert.equal(state(runtime).board_events.filter((event) => event.kind === "next_day").length, 1);
assert.ok(Array.from({ length: 8 }, (_, index) => boardCellPresentation(runtime, index)).every((cell) => cell.label === "？？？"));

const firstWild = state(runtime).board_events.findIndex((event) => event.kind === "wild");
const started = activateSafariDayBoardCell(runtime, firstWild);
assert.equal(started.result, "dispatched");
assert.equal(state(runtime).battle.kind, "wild");
assert.equal(typeof state(runtime).battle.encounter.species_id, "string");
assert.equal(state(runtime).battle.foe.species, state(runtime).battle.encounter.species_id);
assert.ok(started.operations.some((operation) => operation.op === "create_general_type_encounter"));
assert.ok(started.operations.some((operation) => operation.op === "start_wild_battle"));

let lastRound;
for (let turn = 0; turn < 20 && !state(runtime).battle.completed; turn += 1) {
  lastRound = resolveSafariBattleRound(runtime, "TACKLE");
}
assert.equal(state(runtime).battle.decision, 1);
assert.equal(state(runtime).board_consumed[firstWild], true);
assert.ok(lastRound.operations.some((operation) => operation.op === "end_of_battle"));
assert.ok(lastRound.presentation.some((event) => event.type === "battle_result"));
returnSafariToDayBoard(runtime);
assert.equal(state(runtime).battle, null);

// Capture -> Party -> save/load.
const secondWild = state(runtime).board_events.findIndex((event, index) => event.kind === "wild" && index !== firstWild);
activateSafariDayBoardCell(runtime, secondWild);
const captured = attemptSafariCapture(runtime);
assert.equal(captured.result, "caught");
assert.equal(captured.destination, "party");
assert.equal(runtime.player.party.length, 2);
returnSafariToDayBoard(runtime);

const storage = new MemoryStorage();
saveSafariPlayableRun(storage, runtime);
runtime.variables.mapless.day = 99;
const loaded = loadSafariPlayableRun(storage, runtime);
assert.equal(loaded.found, true);
runtime = loaded.state;
assert.equal(state(runtime).day, 1);
assert.equal(runtime.player.party.length, 2);
assert.ok(state(runtime).board_events.filter((event) => event.kind === "shop").every((event) => event.canonical_shop));

const nextDay = state(runtime).board_events.findIndex((event) => event.kind === "next_day");
const advanced = activateSafariDayBoardCell(runtime, nextDay);
assert.equal(advanced.result, "day_advanced");
assert.equal(state(runtime).day, 2);
assert.ok(state(runtime).board_events.filter((event) => event.kind === "shop").every((event) => event.canonical_shop));

console.log(JSON.stringify({
  ok: true,
  day: state(runtime).day,
  party: runtime.player.party.length,
  purchased: selected.id,
  shopType: shop.facilityId,
  vertical: "canonical_shop_wild_capture_persistence_next_day",
}));
