import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { openSafariNormalEventTouch, supportsSafariNormalEventTouch } from "../runtime/safari-normal-event-touch-handoff.js";

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

const dispatcher = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const bridge = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const touchBranch = dispatcher.indexOf("supportsSafariNormalEventTouch(event.normal_event_id)");
const legacyBranch = dispatcher.indexOf('event.normal_event_id === "street_performer"');
assert.ok(touchBranch >= 0 && legacyBranch > touchBranch, "browser touch handoff must precede legacy native-dialog interaction fallbacks");
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
]) assert.equal(bridge.includes(ownerName), true, `touch bridge must return to existing owner ${ownerName}`);
assert.equal(bridge.includes("saveSafariPlayableRun(window.localStorage, current)"), true);
assert.equal(index.includes('id="normal-event-card"'), true);
assert.equal(index.includes('id="normal-event-actions"'), true);
assert.equal(index.includes("normal-event-touch-presentation.js"), true);
assert.equal(index.includes("normal-event-touch-presentation.css"), true);

console.log("Safari shared normal-event touch UI smoke: PASS");
