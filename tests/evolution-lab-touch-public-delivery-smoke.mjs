import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const presentation = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");

assert.match(index, /\.\/normal-event-touch-presentation\.js\?v=20260912-0400/);
assert.doesNotMatch(index, /\.\/normal-event-touch-presentation\.js\?v=20260912-0200/);
assert.match(presentation, /active\.eventId === "evolution_lab"/);
assert.match(presentation, /evolution_lab:"\.\/runtime\/safari-evolution-lab-interaction\.js"/);
assert.match(presentation, /active\.selection\?\.kind === "pokemon"/);
assert.match(presentation, /active\.selection\?\.kind === "evolution"/);
assert.match(presentation, /resolveSafariEvolutionLabInteraction/);
assert.match(presentation, /persistSafariOwnerResult/);

console.log("evolution lab touch public delivery smoke: ok");
