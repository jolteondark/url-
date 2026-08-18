import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../runtime/safari-web-playable-integration.js", import.meta.url),
  "utf8",
);

const start = source.indexOf("export async function returnSafariToDayBoard(runtime)");
const end = source.indexOf("\nexport async function enterSafariVillage", start);
assert.ok(start >= 0 && end > start, "Safari return facade must exist");
const body = source.slice(start, end);
assert.match(body, /await returnSafariNormalToDayBoard\(runtime\)/,
  "ordinary completed Battle must still delegate run-end transition to the normal lifecycle owner");
assert.match(body, /globalThis\.__maplessSafariRuntime = runtime/,
  "run-end return must keep the mutated caller as the live Safari runtime");
assert.match(body, /publishRuntimeChanged\(\)/,
  "run-end return must notify the required home/carryover UI after owner mutation");
assert.ok(
  body.indexOf("publishRuntimeChanged()") > body.indexOf("returnSafariNormalToDayBoard(runtime)"),
  "home UI notification must occur after the lifecycle owner mutates the runtime",
);

console.log("Safari run-end return -> live home runtime change: ok");
