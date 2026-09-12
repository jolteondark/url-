import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const command = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const touch = await readFile(new URL("../runtime/safari-evolution-lab-touch.js", import.meta.url), "utf8");
const presentation = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");

assert.match(index, /"\.\/runtime\/safari-pokemon-center-command\.js": "\.\/runtime\/safari-pokemon-center-command\.js\?v=20260912-1700"/);
assert.match(index, /"\.\/runtime\/safari-evolution-lab-touch\.js": "\.\/runtime\/safari-evolution-lab-touch\.js\?v=20260912-1600"/);
assert.doesNotMatch(index, /safari-pokemon-center-command\.js\?v=20260912-1600/);
assert.match(command, /from "\.\/safari-evolution-lab-touch\.js"/);
assert.doesNotMatch(command, /safari-evolution-lab-touch\.js\?v=/);
assert.match(command, /normal_event_id === "evolution_lab" && typeof globalThis\.document !== "undefined"/);
assert.match(touch, /safariEvolutionLabPresentation/);
assert.match(touch, /eventId:"evolution_lab"/);
assert.doesNotMatch(touch, /confirm\s*\(/);
assert.doesNotMatch(touch, /saveSafariPlayableRun/);
assert.match(index, /\.\/normal-event-touch-presentation\.js\?v=20260912-1300/);
assert.match(presentation, /active\.eventId === "evolution_lab"/);
assert.match(presentation, /evolution_lab:"\.\/runtime\/safari-evolution-lab-interaction\.js"/);
assert.match(presentation, /persistSafariOwnerResult/);

console.log("evolution lab touch public delivery smoke: ok");
