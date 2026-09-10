import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const touch = readFileSync(new URL("../runtime/safari-normal-event-touch-handoff.js", import.meta.url), "utf8");
const interaction = readFileSync(new URL("../runtime/safari-fake-nurse-interaction.js", import.meta.url), "utf8");

const fakeNurseDefinition = touch.match(/if \(eventId === "fake_nurse"\) \{[\s\S]*?\n  \}\n  if \(eventId === "traveling_cook"\)/)?.[0] ?? "";
assert.match(fakeNurseDefinition, /id:"check_id:heal"/);
assert.match(fakeNurseDefinition, /id:"check_id:leave"/);
assert.match(fakeNurseDefinition, /id:"pay"/);
assert.match(fakeNurseDefinition, /id:"leave"/);
assert.doesNotMatch(fakeNurseDefinition, /normal_data\?\.fake|id_roll|resolveFakeNurse|start_trainer_battle_request/);

assert.match(interaction, /const availableActions=\["pay","check_id:heal","check_id:leave","leave"\]/);
assert.match(interaction, /export async function resolveSafariFakeNurseInteraction/);
assert.match(interaction, /registerSafariNormalEventBattleContinuation\("fake_nurse"/);
assert.match(interaction, /\{op:"request_save",reason:"fake_nurse_resolved"\}/);
assert.match(interaction, /activateSafariNormalEventTrainerBattle\(runtime,index,\{eventId:"fake_nurse",actionId:"check_id"/);

console.log("fake nurse ID-check touch owner smoke: ok");
