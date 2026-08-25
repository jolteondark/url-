import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const presentation = fs.readFileSync(path.join(root, "normal-event-touch-presentation.js"), "utf8");
const handoff = fs.readFileSync(path.join(root, "runtime", "safari-normal-event-touch-handoff.js"), "utf8");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-berry-thief-interaction.js"), "utf8");

assert.match(
  handoff,
  /SUPPORTED = new Set\(\[[\s\S]*?"berry_thief"/,
  "Berry Thief must be accepted by the Safari Day Board normal-event touch handoff",
);
assert.match(
  handoff,
  /eventId === "berry_thief"[\s\S]*?safariBerryThiefBerryChoices\(runtime\)[\s\S]*?id:`bait:\$\{item\}`[\s\S]*?id:"chase"[\s\S]*?id:"leave"/,
  "Berry Thief Day Board handoff must expose bait/chase/leave actions",
);
assert.match(
  presentation,
  /berry_thief:\"\.\/runtime\/safari-berry-thief-interaction\.js\"/,
  "Berry Thief must be registered with the shared Safari normal-event UI owner loader",
);
assert.match(
  presentation,
  /active\.eventId === \"berry_thief\"\) return owner\.resolveSafariBerryThiefInteraction\(current, active\.boardIndex, actionId\)/,
  "Berry Thief touch actions must dispatch through the dedicated Safari adapter",
);
assert.match(
  adapter,
  /export async function resolveSafariBerryThiefInteraction\(/,
  "Berry Thief Safari adapter must expose the owner entry point used by touch presentation",
);
assert.match(
  adapter,
  /availableActions = \[\.\.\.berryIds\(runtime\)\.map\(\(item\) => `bait:\$\{item\}`\), \"chase\", \"leave\"\]/,
  "Berry Thief adapter must expose bait/chase/leave actions from runtime inventory",
);
assert.match(
  adapter,
  /activateSafariNormalEventWildBattle\(/,
  "Berry Thief chase/bait routes must use the shared normal-event wild Battle handoff",
);
assert.match(
  adapter,
  /grantNormalEventPokemonFromEncounter\(/,
  "Berry Thief leave-join route must use the shared normal-event Pokémon grant owner",
);

console.log("Safari Berry Thief touch handoff smoke passed");
