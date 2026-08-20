import assert from "node:assert/strict";
import {
  applySafariBoundaryTrialEntry,
  applySafariCampRecovery,
  prepareSafariCampNextDay,
} from "../runtime/safari-camp-next-day-command.js";
import { attemptSafariFlee } from "../runtime/safari-flee-command.js";

await import("./safari-day14-river-day15-continued-run-smoke.mjs");
const web = await import("../runtime/safari-web-playable-integration.js");

const runtime = globalThis.__maplessSafariRuntime;
assert.ok(runtime, "continued-run predecessor must expose the loaded Safari runtime");
const state = runtime.variables.mapless;
const partyIdentity = () => runtime.player.party.map((pokemon, index) =>
  pokemon?.personal_id ?? pokemon?.id ?? pokemon?.uuid ?? `${pokemon?.species}:${index}`);
const identityAtDay15 = partyIdentity();

function nextDayIndex() {
  const index = state.board_events.findIndex((entry) => entry?.kind === "next_day");
  assert.ok(index >= 0, "canonical generated Board must retain one next_day cell");
  return index;
}

async function advanceOrdinaryDay(expectedDay) {
  const index = nextDayIndex();
  const camp = prepareSafariCampNextDay(runtime, index, true);
  applySafariCampRecovery(runtime, camp);
  const boundary = applySafariBoundaryTrialEntry(runtime, camp);
  assert.equal(boundary.entered, false, `DAY ${expectedDay} must remain an ordinary Board floor`);
  const advanced = await web.activateSafariDayBoardCell(runtime, index);
  assert.equal(advanced.result, "day_advanced");
  assert.equal(state.day, expectedDay);
  assert.equal(state.location, "day_board");
  assert.equal(state.battle, null);
  assert.deepEqual(state.board_revealed, Array(8).fill(false));
  assert.deepEqual(state.board_consumed, Array(8).fill(false));
  assert.deepEqual(state.board_visited, Array(8).fill(false));
}

assert.equal(state.day, 15);
assert.deepEqual(state.board_events.map((entry) => entry?.kind),
  ["delta_exchange", "next_day", "type_event", "house", "wild", "miner", "wild", "trainer"]);
const bagBeforeWild = structuredClone(runtime.bag);

// Consume one real generated DAY15 wild cell through the existing Safari Battle/flee owner.
const wildIndex = state.board_events.findIndex((entry) => entry?.kind === "wild");
assert.ok(wildIndex >= 0);
const wildStart = await web.activateSafariDayBoardCell(runtime, wildIndex);
assert.equal(wildStart.result, "dispatched");
assert.equal(state.battle?.kind, "wild");
const activeIndex = Number(state.battle.player_party_index ?? 0);
runtime.player.party[activeIndex].stats.SPEED = 9999;
state.battle.foe.stats.SPEED = 1;
const escaped = attemptSafariFlee(runtime, { runRandomSeed: 15, randomRoll: 255 });
assert.equal(escaped.escaped, true);
assert.equal(state.battle, null);
assert.equal(state.board_consumed[wildIndex], true);
assert.equal(state.board_visited[wildIndex], true);
assert.deepEqual(runtime.bag, bagBeforeWild, "successful DAY15 flee must not mutate Bag/Money");
assert.deepEqual(partyIdentity(), identityAtDay15, "DAY15 wild/flee must retain Party identity");

// Continue the same runtime onto the deterministic DAY16 Board.
await advanceOrdinaryDay(16);
assert.deepEqual(state.board_events.map((entry) => entry?.kind),
  ["egg_shop", "treasure", "delta_exchange", "tavern", "trainer", "shop", "next_day", "wild"],
  "DAY16 must be the next deterministic canonical weighted Board");
assert.deepEqual(partyIdentity(), identityAtDay15);

// Use the real generated DAY16 shop and retain that transaction into DAY17.
const shopIndex = state.board_events.findIndex((entry) => entry?.kind === "shop");
assert.ok(shopIndex >= 0);
const opened = await web.activateSafariDayBoardCell(runtime, shopIndex);
assert.equal(opened.result, "shop_opened");
const shop = web.safariShopPresentation(runtime);
assert.ok(shop?.items?.length > 0, "DAY16 shop must expose canonical stock");
const affordable = shop.items.find((item) =>
  item?.transaction_kind === "buy" && Number(item.price) > 0 && Number(item.price) <= Number(shop.money));
assert.ok(affordable, "continued run must retain enough Money for one DAY16 canonical shop purchase");
const moneyBefore = Number(runtime.bag.money);
const bought = await web.purchaseSafariShopItem(runtime, {
  itemId: affordable.id,
  quantity: 1,
  confirmed: true,
});
assert.equal(bought.result, "bought");
assert.equal(Number(runtime.bag.money), moneyBefore - Number(affordable.price));
const bagAfterDay16Shop = structuredClone(runtime.bag);

await advanceOrdinaryDay(17);
assert.deepEqual(runtime.bag, bagAfterDay16Shop, "DAY17 must retain the real DAY16 shop transaction");
assert.deepEqual(partyIdentity(), identityAtDay15, "DAY17 must still hold the same Pokemon identities");
assert.deepEqual(state.board_events.map((entry) => entry?.kind),
  ["wild", "trainer", "wild", "miner", "wild", "trap", "buried_item", "next_day"],
  "DAY17 must be the next deterministic canonical weighted Board");
assert.equal(state.location, "day_board");
assert.equal(state.battle, null);

console.log("Safari DAY15 wild/flee -> DAY16 real shop -> DAY17 canonical Board: PASS");
