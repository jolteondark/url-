import assert from "node:assert/strict";
import {
  applySafariBoundaryTrialEntry,
  applySafariCampRecovery,
  prepareSafariCampNextDay,
} from "../runtime/safari-camp-next-day-command.js";

await import("./safari-day18-egg-shop-day19-continued-run-smoke.mjs");
const web = await import("../runtime/safari-web-playable-integration.js");

const runtime = globalThis.__maplessSafariRuntime;
assert.ok(runtime, "DAY19 predecessor must expose the exact loaded Safari runtime");
const state = runtime.variables.mapless;
assert.equal(state.day, 19);
assert.deepEqual(state.board_events.map((entry) => entry?.kind),
  ["wild", "type_event", "wild", "trap", "trainer", "shop", "next_day", "buried_item"],
  "DAY19 must retain the deterministic generated Board rather than a fixture replacement");
const eggBeforeShop = structuredClone(runtime.player.party.at(-1));
assert.equal(eggBeforeShop.species, "DELTADODUO");
assert.equal(eggBeforeShop.steps_to_hatch, 20);

// Consume the real generated DAY19 shop through its existing Safari owner.
const shopIndex = state.board_events.findIndex((entry) => entry?.kind === "shop");
assert.equal(shopIndex, 5);
const opened = await web.activateSafariDayBoardCell(runtime, shopIndex);
assert.equal(opened.result, "shop_opened");
const shop = web.safariShopPresentation(runtime);
assert.ok(shop?.items?.length > 0);
const affordable = shop.items.find((item) =>
  item?.transaction_kind === "buy" && Number(item.price) > 0 && Number(item.price) <= Number(shop.money));
let shopOutcome;
if (affordable) {
  const moneyBefore = Number(runtime.bag.money);
  const bought = await web.purchaseSafariShopItem(runtime, {
    itemId: affordable.id,
    quantity: 1,
    confirmed: true,
  });
  assert.equal(bought.result, "bought");
  assert.equal(Number(runtime.bag.money), moneyBefore - Number(affordable.price));
  shopOutcome = "bought";
} else {
  const bagBefore = structuredClone(runtime.bag);
  const left = web.leaveSafariShop(runtime);
  assert.equal(left.result, "returned");
  assert.deepEqual(runtime.bag, bagBefore);
  shopOutcome = "left_unaffordable";
}
assert.equal(state.shop, null);
assert.equal(runtime.player.party.at(-1).species, "DELTADODUO");
assert.equal(runtime.player.party.at(-1).steps_to_hatch, 20,
  "ordinary shop interaction must not synthesize Egg visit progress");

// DAY19 -> DAY20 is the existing boundary-trial seam, not a generated DAY20 Board.
const nextIndex = state.board_events.findIndex((entry) => entry?.kind === "next_day");
assert.equal(nextIndex, 6);
const previousLastLeader = state.boundary_trial?.last_leader ?? null;
const camp = prepareSafariCampNextDay(runtime, nextIndex, true);
applySafariCampRecovery(runtime, camp);
const entered = applySafariBoundaryTrialEntry(runtime, camp);
assert.equal(entered.entered, true);
assert.equal(state.day, 20);
assert.equal(state.location, "boundary_trial");
assert.equal(state.board_suspended_for_boundary, true);
assert.equal(state.battle, null);
assert.ok(state.boundary_trial?.pending_leader,
  "second boundary entry must select one pending leader through the existing leader-bag owner");
assert.notEqual(state.boundary_trial.pending_leader, previousLastLeader,
  "leader-bag owner must not immediately replay the previous cleared leader");
assert.equal(runtime.player.party.at(-1).species, "DELTADODUO");
assert.equal(runtime.player.party.at(-1).steps_to_hatch, 20,
  "hatch visit lifecycle remains separate and must not be invented by camp/boundary entry");
assert.ok(["bought", "left_unaffordable"].includes(shopOutcome));

console.log(`Safari DAY19 real shop (${shopOutcome}) -> DAY20 second boundary entry: PASS`);
