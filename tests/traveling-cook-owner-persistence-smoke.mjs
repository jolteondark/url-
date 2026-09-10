import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-traveling-cook-interaction.js", import.meta.url), "utf8");
const baseSource = await readFile(new URL("../runtime/safari-traveling-cook-interaction-base.js", import.meta.url), "utf8");

assert.match(source, /function operationsRequestSave\(operations = \[\]\)/, "Traveling Cook should derive save intent from emitted operations");
assert.match(source, /\{ op:"request_save", reason:"traveling_cook_power_meal_resolved" \}/, "resolved power-meal routes should emit request_save");
assert.match(source, /persistenceRequested:operationsRequestSave\(state\.last_operations\)/, "power-meal persistence should project from operations");
assert.doesNotMatch(source, /persistenceRequested:true/, "Traveling Cook power-meal adapter must not keep an independent persistence boolean truth");

assert.match(baseSource, /function operationsRequestSave\(operations = \[\]\)/, "Traveling Cook base routes should derive save intent from emitted operations");
assert.match(baseSource, /ensureResolvedSave\(state, "traveling_cook_prototype_resolved"\)/, "resolved prototype routes should emit request_save");
assert.match(baseSource, /if \(owner\.result\) ensureResolvedSave\(state, "traveling_cook_resolved"\)/, "resolved base routes should emit request_save");
assert.match(baseSource, /persistenceRequested: operationsRequestSave\(state\.last_operations\)/, "base persistence should project from operations");
assert.doesNotMatch(baseSource, /persistenceRequested:true/, "Traveling Cook base adapter must not keep an independent persistence boolean truth");

console.log("traveling cook owner-persistence smoke: ok");
