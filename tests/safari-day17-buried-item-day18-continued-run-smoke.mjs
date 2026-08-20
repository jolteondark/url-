import assert from "node:assert/strict";
import {
  applySafariBoundaryTrialEntry,
  applySafariCampRecovery,
  prepareSafariCampNextDay,
} from "../runtime/safari-camp-next-day-command.js";
import { quantity } from "../runtime/bag-economy-mart-flow.js";

await import("./safari-day15-wild-day16-shop-day17-continued-run-smoke.mjs");
const web = await import("../runtime/safari-web-playable-integration.js");

const runtime = globalThis.__maplessSafariRuntime;
assert.ok(runtime, "DAY17 predecessor must expose the same Safari runtime");
const state = runtime.variables.mapless;
const identity = runtime.player.party.map((pokemon, index) =>
  pokemon?.personal_id ?? pokemon?.id ?? pokemon?.uuid ?? `${pokemon?.species}:${index}`);

assert.equal(state.day, 17);
assert.deepEqual(state.board_events.map((entry) => entry?.kind),
  ["wild", "trainer", "wild", "miner", "wild", "trap", "buried_item", "next_day"]);

// Consume the real generated DAY17 buried_item through the live Safari Board dispatcher.
const buriedIndex = state.board_events.findIndex((entry) => entry?.kind === "buried_item");
assert.equal(buriedIndex, 6, "DAY17 canonical buried-item slot must remain stable");
const before = quantity(runtime.bag.slots, "AWAKENING");
const reward = await web.activateSafariDayBoardCell(runtime, buriedIndex);
assert.equal(reward.result, "rewarded");
assert.equal(reward.completed, true);
assert.equal(reward.seed, 1280005053,
  "DAY17 slot 6 must use canonical v0.9.97 day/index buried-item seed");
assert.equal(reward.item, "AWAKENING",
  "canonical Ruby RNG must select medicine roll 12 then pool index 3");
assert.equal(quantity(runtime.bag.slots, "AWAKENING"), before + 1);
assert.equal(state.board_revealed[buriedIndex], true);
assert.equal(state.board_visited[buriedIndex], true);
assert.equal(state.board_consumed[buriedIndex], true);
assert.equal(reward.persistenceRequested, true);
assert.equal(reward.operations.filter((operation) => operation?.op === "request_save").length, 1);

// One-shot canonical event: revisiting the consumed cell must never duplicate the reward.
const revisited = await web.activateSafariDayBoardCell(runtime, buriedIndex);
assert.equal(revisited.result, "already_consumed");
assert.equal(quantity(runtime.bag.slots, "AWAKENING"), before + 1);
const bagAfterBuried = structuredClone(runtime.bag);

// Continue the exact same run onto DAY18 and preserve the item receipt and Party identity.
const nextIndex = state.board_events.findIndex((entry) => entry?.kind === "next_day");
assert.ok(nextIndex >= 0);
const camp = prepareSafariCampNextDay(runtime, nextIndex, true);
applySafariCampRecovery(runtime, camp);
const boundary = applySafariBoundaryTrialEntry(runtime, camp);
assert.equal(boundary.entered, false, "DAY18 must remain an ordinary Board floor");
const advanced = await web.activateSafariDayBoardCell(runtime, nextIndex);
assert.equal(advanced.result, "day_advanced");
assert.equal(state.day, 18);
assert.equal(state.location, "day_board");
assert.equal(state.battle, null);
assert.deepEqual(runtime.bag, bagAfterBuried, "DAY18 must retain the DAY17 buried-item reward");
assert.deepEqual(runtime.player.party.map((pokemon, index) =>
  pokemon?.personal_id ?? pokemon?.id ?? pokemon?.uuid ?? `${pokemon?.species}:${index}`), identity,
  "DAY18 must retain the same Pokemon identities");
assert.deepEqual(state.board_events.map((entry) => entry?.kind),
  ["trainer", "egg_shop", "trainer", "type_event", "next_day", "trainer", "wild", "wild"],
  "DAY18 must be the next deterministic canonical weighted Board");

console.log("Safari DAY17 buried item -> AWAKENING -> one-shot -> DAY18 canonical Board: PASS");
