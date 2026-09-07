import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [legacy, command, sharedUi, adapter, touch, manifest] = await Promise.all([
  read("machine-gacha-touch-presentation.js"),
  read("runtime/safari-pokemon-center-command.js"),
  read("normal-event-touch-presentation.js"),
  read("runtime/safari-machine-gacha-interaction.js"),
  read("runtime/safari-machine-gacha-touch.js"),
  read("board-presentation-manifest.json"),
]);

assert.doesNotMatch(legacy, /addEventListener\s*\(\s*["']click["']/);
assert.doesNotMatch(legacy, /stopImmediatePropagation/);
assert.match(command, /openSafariMachineGachaTouch/);
assert.match(command, /normal_event_id === "machine_gacha"/);
assert.match(sharedUi, /machine_gacha:"\.\/runtime\/safari-machine-gacha-interaction\.js"/);
assert.match(sharedUi, /resolveSafariMachineGachaInteraction\(current, active\.boardIndex, actionId\)/);
assert.match(sharedUi, /persistSafariOwnerResult\(current, result, window\.localStorage\)/);
assert.match(adapter, /resolveCanonicalMachineGacha/);
assert.match(adapter, /persistenceRequested:true/);
assert.match(touch, /eventId:"machine_gacha"/);
assert.match(manifest, /machine-gacha-touch-presentation\.js\?v=20260908-0430/);

console.log("machine gacha single-owner smoke: ok");
