import assert from "node:assert/strict";
await import("./safari-egg-shop-touch-ui-static-smoke.mjs");
import {
  applySafariBoundaryTrialEntry,
  applySafariCampRecovery,
  prepareSafariCampNextDay,
} from "../runtime/safari-camp-next-day-command.js";
import {
  MAPLESS_EGG_SHOP_PRICE_V108,
  maplessEggShopCandidatePoolV108,
  maplessEggShopStockForDayV108,
} from "../runtime/mapless-egg-shop-v108-flow.js";
import { purchaseSafariEggShopEgg, safariEggShopPresentation } from "../runtime/safari-egg-shop-interaction.js";

await import("./safari-day17-buried-item-day18-continued-run-smoke.mjs");
const web = await import("../runtime/safari-web-playable-integration.js");

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

let runtime = globalThis.__maplessSafariRuntime;
assert.ok(runtime, "DAY18 predecessor must expose the same Safari runtime");
let state = runtime.variables.mapless;
assert.equal(state.day, 18);
assert.equal(maplessEggShopCandidatePoolV108().length, 499,
  "canonical GENERAL/CUSTOM egg-appropriate pool must remain 499 species");
assert.deepEqual(maplessEggShopStockForDayV108(18),
  ["DELTADODUO", "NICKIT", "VOLTORB", "MORELULL", "ALOMOMOLA"],
  "DAY18 stock must match Ruby Random.new(day*1_000_003+4009) shuffle");

const eggIndex = state.board_events.findIndex((entry) => entry?.kind === "egg_shop");
assert.equal(eggIndex, 1, "DAY18 canonical egg-shop slot must remain stable");
const active = runtime.player.party[0];
const hpBeforeShop = Math.max(1, Number(active.max_hp ?? active.hp ?? 2) - 1);
active.hp = hpBeforeShop;
const opened = await web.activateSafariDayBoardCell(runtime, eggIndex);
assert.equal(opened.result, "egg_shop_opened");
assert.equal(active.hp, hpBeforeShop, "entering the egg shop must not inherit generic facility healing");
assert.equal(state.board_revealed[eggIndex], true);
assert.equal(state.board_visited[eggIndex], true);
assert.equal(state.board_consumed[eggIndex], false, "egg shop remains reusable like canonical facility");
const shop = safariEggShopPresentation(runtime);
assert.deepEqual(shop.items.map((entry) => entry.species),
  ["DELTADODUO", "NICKIT", "VOLTORB", "MORELULL", "ALOMOMOLA"]);
assert.equal(shop.items[0].typeLabel, "エスパー");
assert.equal(shop.price, MAPLESS_EGG_SHOP_PRICE_V108);

const partyBefore = runtime.player.party.length;
const moneyBefore = Number(runtime.bag.money);
assert.ok(moneyBefore >= MAPLESS_EGG_SHOP_PRICE_V108,
  "continued-run seed must retain enough money for one canonical egg purchase");
const bought = await purchaseSafariEggShopEgg(runtime, 0, {
  confirmed: true,
  finalPersonalId: 0x12345678,
  randomInt(limit) { return 0 % Number(limit); },
});
assert.equal(bought.result, "bought");
assert.equal(bought.species, "DELTADODUO", "DAY18 first CUSTOM stock entry must materialize through the shared Pokemon owner");
assert.equal(bought.level, 8, "DAY18 NORMAL base Lv9 with canonical -1 variance must hatch at Lv8");
assert.equal(runtime.player.party.length, partyBefore + 1);
assert.equal(Number(runtime.bag.money), moneyBefore - MAPLESS_EGG_SHOP_PRICE_V108);
assert.equal(bought.persistenceRequested, true);
assert.equal(bought.operations.filter((operation) => operation?.op === "request_save").length, 1);
const egg = runtime.player.party.at(-1);
assert.equal(egg.species, "DELTADODUO");
assert.deepEqual(egg.moves.map((move) => typeof move === "string" ? move : move.id), ["PECK", "GROWL", "PSYWAVE"]);
assert.equal(egg.steps_to_hatch, 20);
assert.equal(egg.mapless_hatch_system_version, 918);
assert.equal(egg.mapless_egg_shop_bonus_pending, true);
assert.equal(egg.mapless_egg_shop_day, 18);
assert.equal(egg.mapless_hatch_level, 8);
assert.equal(egg.obtain_method, 1);
assert.equal(egg.obtain_text, "卵屋");

// Save the real post-purchase runtime and reload through a fresh Continue owner.
const storage = new MemoryStorage();
web.saveSafariPlayableRun(storage, runtime);
const continued = web.loadSafariPlayableRun(storage, web.createSafariPlayableRuntime());
assert.equal(continued.found, true);
runtime = continued.state;
state = runtime.variables.mapless;
const restoredEgg = runtime.player.party.at(-1);
assert.equal(state.day, 18);
assert.equal(restoredEgg.species, "DELTADODUO");
assert.equal(restoredEgg.steps_to_hatch, 20);
assert.equal(restoredEgg.mapless_hatch_system_version, 918);
assert.equal(restoredEgg.mapless_egg_shop_bonus_pending, true);
assert.equal(restoredEgg.mapless_hatch_level, 8);

// Continue the exact loaded run to the next ordinary canonical Board.
const nextIndex = state.board_events.findIndex((entry) => entry?.kind === "next_day");
assert.equal(nextIndex, 4);
const camp = prepareSafariCampNextDay(runtime, nextIndex, true);
applySafariCampRecovery(runtime, camp);
const boundary = applySafariBoundaryTrialEntry(runtime, camp);
assert.equal(boundary.entered, false, "DAY19 must remain an ordinary Board floor");
const advanced = await web.activateSafariDayBoardCell(runtime, nextIndex);
assert.equal(advanced.result, "day_advanced");
assert.equal(state.day, 19);
assert.equal(state.location, "day_board");
assert.equal(state.battle, null);
assert.equal(runtime.player.party.at(-1).species, "DELTADODUO");
assert.equal(runtime.player.party.at(-1).mapless_egg_shop_bonus_pending, true);
assert.equal(Number(runtime.bag.money), moneyBefore - MAPLESS_EGG_SHOP_PRICE_V108);

console.log("Safari DAY18 egg shop -> CUSTOM Egg purchase -> Save/Continue -> DAY19: PASS");
