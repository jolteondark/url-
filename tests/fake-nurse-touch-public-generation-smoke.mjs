import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const touch = readFileSync(new URL("../runtime/safari-normal-event-touch-handoff.js", import.meta.url), "utf8");

assert.match(index, /"\.\/runtime\/safari-normal-event-touch-handoff\.js": "\.\/runtime\/safari-normal-event-touch-handoff\.js\?v=20260911-0258"/);
assert.doesNotMatch(index, /safari-normal-event-touch-handoff\.js\?v=20260903-1130/);

const fakeNurseDefinition = touch.match(/if \(eventId === "fake_nurse"\) \{[\s\S]*?\n  \}\n  if \(eventId === "traveling_cook"\)/)?.[0] ?? "";
assert.match(fakeNurseDefinition, /id:"check_id:heal"/);
assert.match(fakeNurseDefinition, /id:"check_id:leave"/);
assert.doesNotMatch(fakeNurseDefinition, /normal_data\?\.fake|id_roll|resolveFakeNurse|start_trainer_battle_request/);

console.log("fake nurse touch public generation smoke: ok");
