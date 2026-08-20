import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { openSafariNormalEventTouch, supportsSafariNormalEventTouch } from "../runtime/safari-normal-event-touch-handoff.js";
await import("./safari-treasure-touch-smoke.mjs");
await import("./safari-miner-touch-owner-smoke.mjs");

const expected = Object.freeze({
  street_performer:["watch","leave"],
  mushroom_field:["sell","leave"],
  hot_spring:["enter","leave"],
  fake_nurse:["pay","leave"],
  traveling_cook:["heal","medicine","leave"],
  flooded_river:["force","leave"],
});

const originalDocument = globalThis.document;
globalThis.document = {};
try {
  for (const [eventId, actionIds] of Object.entries(expected)) {
    assert.equal(supportsSafariNormalEventTouch(eventId), true);
    const runtime = {
      player:{party:[]},
      bag:{money:5000,slots:[]},
      variables:{mapless:{day:11,location:"day_board",battle:null,shop:null,mapless_carry_class:"general",board_events:[{kind:"normal_event",normal_event_id:eventId}],board_revealed:[false],board_visited:[false],board_consumed:[false],last_operations:[]}},
    };
    const result = openSafariNormalEventTouch(runtime, 0);
    assert.equal(result.result, `${eventId}_ready`);
    assert.equal(runtime.variables.mapless.board_revealed[0], true);
    assert.equal(runtime.variables.mapless.board_visited[0], true);
    assert.equal(runtime.variables.mapless.board_consumed[0], false);
    assert.deepEqual(result.availableActions, actionIds);
    assert.equal(globalThis.__maplessNormalEventUi.eventId, eventId);
    assert.deepEqual(globalThis.__maplessNormalEventUi.actions.map((action) => action.id), actionIds);
  }
} finally {
  globalThis.__maplessNormalEventUi = null;
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
}

assert.equal(supportsSafariNormalEventTouch("wounded_pokemon"), true, "wounded Pokemon must enter the in-page touch handoff before its legacy native dialog");

const dispatcher = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const handoff = await readFile(new URL("../runtime/safari-normal-event-touch-handoff.js", import.meta.url), "utf8");
const bridge = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const touchBranch = dispatcher.indexOf("supportsSafariNormalEventTouch(event.normal_event_id)");
const legacyBranch = dispatcher.indexOf('event.normal_event_id === "street_performer"');
assert.ok(touchBranch >= 0 && legacyBranch > touchBranch, "browser touch handoff must precede legacy native-dialog interaction fallbacks");
assert.equal(dispatcher.includes('event?.kind === "treasure"'), true, "treasure Board cells must enter the shared touch scene");
assert.equal(dispatcher.includes("openSafariTreasureTouch(runtime, index)"), true);
assert.equal(dispatcher.includes('event?.kind === "miner"'), true, "Miner Board cells must enter the shared touch scene");
assert.equal(dispatcher.includes("openSafariMinerTouch(runtime, index)"), true);
assert.equal(bridge.includes("globalThis.prompt"), false);
assert.equal(bridge.includes("globalThis.confirm"), false);
assert.equal(bridge.includes("globalThis.alert"), false);
for (const ownerName of [
  "resolveSafariStreetPerformerInteraction",
  "resolveSafariMushroomFieldInteraction",
  "resolveSafariHotSpringInteraction",
  "resolveSafariFakeNurseInteraction",
  "resolveSafariTravelingCookInteraction",
  "resolveSafariFloodedRiverInteraction",
  "resolveSafariWoundedPokemonDecision",
  "resolveSafariTreasureChest",
  "resolveSafariMinerAction",
]) assert.equal(bridge.includes(ownerName), true, `touch bridge must return to existing owner ${ownerName}`);
assert.equal(handoff.includes('"wounded_pokemon"'), true);
assert.equal(handoff.includes("prepareSafariWoundedPokemonCandidate"), true);
assert.equal(handoff.includes("safariWoundedHealingInventory"), true);
assert.equal(handoff.includes('id:`treat:${entry.itemId}`'), true, "wounded touch actions must be projected from eligible Bag healing inventory");
assert.equal(bridge.includes('String(actionId).startsWith("treat:")'), true, "wounded touch treatment must return the selected item id to the existing decision owner");
assert.equal(bridge.includes("saveSafariPlayableRun(window.localStorage, current)"), true);
assert.equal(index.includes('id="normal-event-card"'), true);
assert.equal(index.includes('id="normal-event-actions"'), true);
assert.equal(index.includes("normal-event-touch-presentation.js"), true);
assert.equal(index.includes("normal-event-touch-presentation.css"), true);

console.log("Safari shared normal-event touch UI smoke: PASS");
