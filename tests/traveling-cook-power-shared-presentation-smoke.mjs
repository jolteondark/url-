import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const presentation = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
const owner = await readFile(new URL("../runtime/safari-traveling-cook-interaction.js", import.meta.url), "utf8");
const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.match(presentation, /id:"pay:power"/, "shared normal-event UI must expose the canonical paid power meal intent");
assert.match(presentation, /id:"berries:power"[\s\S]*disabled:count < 3/, "shared UI must disable the berry power meal when fewer than three berries are available");
assert.match(presentation, /startsWith\("berries:"\)[\s\S]*resolveSafariTravelingCookInteraction\(current, active\.boardIndex, "berries", String\(actionId\)\.slice\(8\)\)/, "shared resolver must route berry meal intents to the Traveling Cook owner");
assert.match(presentation, /startsWith\("pay:"\)[\s\S]*resolveSafariTravelingCookInteraction\(current, active\.boardIndex, "pay", String\(actionId\)\.slice\(4\)\)/, "shared resolver must route paid meal intents to the Traveling Cook owner");
assert.match(owner, /meal !== "power"/, "Traveling Cook owner must remain authoritative for the power meal branch");
assert.match(owner, /setSafariPowerMeal\(runtime, battles\)/, "Traveling Cook owner must own power-meal state mutation");
assert.doesNotMatch(indexHtml, /traveling-cook-power-presentation\.js/, "new public HTML must not require the post-render Traveling Cook power sidecar");
assert.match(indexHtml, /normal-event-touch-presentation\.js\?v=20260908-2230/, "public HTML must cache-bust the shared normal-event presentation");

console.log("traveling cook power shared presentation smoke: ok");
