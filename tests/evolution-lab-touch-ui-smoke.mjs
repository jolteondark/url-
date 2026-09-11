import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const presentation = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");

assert.match(presentation, /evolution_lab:"\.\/runtime\/safari-evolution-lab-interaction\.js"/);
assert.match(presentation, /active\.eventId === "evolution_lab"/);
assert.match(presentation, /active\.selection\?\.kind === "pokemon"/);
assert.match(presentation, /id:`pokemon:\$\{entry\.index\}`/);
assert.match(presentation, /active\.selection\?\.kind === "evolution"/);
assert.match(presentation, /id:`evolution:\$\{entry\.species \?\? entry\.id\}`/);
assert.match(presentation, /resolveSafariEvolutionLabInteraction\(current, active\.boardIndex, \{ id:active\.mode, pokemonIndex \}\)/);
assert.match(presentation, /pokemonIndex:active\.selection\.pokemonIndex/);
assert.match(presentation, /species,/);
assert.doesNotMatch(presentation, /STONE_ITEMS|METALCOAT|UPGRADE|DUBIOUSDISC|normal_seed/);

console.log("evolution lab touch UI smoke: ok");
