import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const command = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const touch = await readFile(new URL("../runtime/safari-evolution-lab-touch.js", import.meta.url), "utf8");
const owner = await readFile(new URL("../runtime/safari-evolution-lab-interaction.js", import.meta.url), "utf8");
const presentation = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");

assert.match(command, /openSafariEvolutionLabTouch/);
assert.match(command, /normal_event_id === "evolution_lab" && typeof globalThis\.document !== "undefined"/);
assert.match(touch, /safariEvolutionLabPresentation/);
assert.match(touch, /__maplessNormalEventUi/);
assert.match(touch, /eventId:"evolution_lab"/);
assert.doesNotMatch(touch, /confirm\s*\(/);
assert.doesNotMatch(touch, /resolveSafariEvolutionLabInteraction/);
assert.doesNotMatch(touch, /saveSafariPlayableRun/);
assert.match(owner, /resolveSafariEvolutionLabInteraction/);
assert.match(presentation, /active\.eventId === "evolution_lab"/);
assert.match(presentation, /persistSafariOwnerResult/);

console.log("evolution lab browser touch smoke: ok");
