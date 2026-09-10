import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-traveling-cook-interaction.js", import.meta.url), "utf8");

assert.match(source, /function operationsRequestSave\(operations = \[\]\)/, "Traveling Cook should derive save intent from emitted operations");
assert.match(source, /\{ op:"request_save", reason:"traveling_cook_power_meal_resolved" \}/, "resolved power-meal routes should emit request_save");
assert.match(source, /persistenceRequested:operationsRequestSave\(state\.last_operations\)/, "power-meal persistence should project from operations");
assert.doesNotMatch(source, /persistenceRequested:true/, "Traveling Cook power-meal adapter must not keep an independent persistence boolean truth");

console.log("traveling cook owner-persistence smoke: ok");
