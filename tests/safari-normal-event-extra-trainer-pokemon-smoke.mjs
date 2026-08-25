import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MAPLESS_DAY_BOARD_TYPE_IDS_V108,
  planMaplessNormalEventExtraTrainerEncounter,
  selectMaplessNormalEventExtraTrainerType,
} from "../runtime/mapless-normal-event-extra-trainer-pokemon.js";

assert.deepEqual(MAPLESS_DAY_BOARD_TYPE_IDS_V108, [
  "NORMAL", "FIRE", "WATER", "ELECTRIC", "GRASS", "ICE",
  "FIGHTING", "POISON", "GROUND", "FLYING", "PSYCHIC", "BUG",
  "ROCK", "GHOST", "DRAGON", "DARK", "STEEL", "FAIRY",
], "extra trainer type sampling must preserve v0.9.108 MaplessDayBoard::TYPE_IDS order");

function runtime(seed = 1, counter = 0) {
  return { variables:{ mapless:{ preview_encounter_seed:seed >>> 0, preview_encounter_counter:counter } } };
}

const explicitRuntime = runtime(7);
const explicit = selectMaplessNormalEventExtraTrainerType(explicitRuntime, "WATER");
assert.equal(explicit.type, "WATER");
assert.equal(explicit.borrowedSharedRunRng, false);
assert.equal(explicitRuntime.variables.mapless.preview_encounter_counter, 0,
  "explicit extra type must not consume shared/global type-selection RNG");

const sampledRuntime = runtime(7);
const sampled = selectMaplessNormalEventExtraTrainerType(sampledRuntime);
assert.ok(MAPLESS_DAY_BOARD_TYPE_IDS_V108.includes(sampled.type));
assert.equal(sampled.borrowedSharedRunRng, true);
assert.equal(sampledRuntime.variables.mapless.preview_encounter_counter, 1,
  "missing extra type must consume exactly one shared/global TYPE_IDS sample");

const firstPlan = planMaplessNormalEventExtraTrainerEncounter({ day:11, requiredType:"NORMAL", extraModifier:1, seed:41 });
const replayPlan = planMaplessNormalEventExtraTrainerEncounter({ day:11, requiredType:"NORMAL", extraModifier:1, seed:41 });
assert.deepEqual(replayPlan, firstPlan, "seed + 1 extra encounter plan must replay deterministically");
assert.equal(firstPlan.encounterSeed, 42);
assert.ok(firstPlan.varianceIndex >= 0 && firstPlan.varianceIndex < 3);
assert.ok(firstPlan.speciesIndex >= 0 && firstPlan.speciesIndex < firstPlan.poolSize);

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const helper = fs.readFileSync(path.join(root, "runtime", "mapless-normal-event-extra-trainer-pokemon.js"), "utf8");
const combat = fs.readFileSync(path.join(root, "runtime", "safari-web-combat-start.js"), "utf8");

assert.match(helper,
  /const encounterSeed = \(eventSeed \+ 1\) >>> 0;[\s\S]*?const varianceIndex = rng\.randInt\([\s\S]*?const speciesIndex = rng\.randInt\(/,
  "create_encounter must consume seeded variance before seeded species selection, matching v0.9.108");
assert.match(combat,
  /generateSafariDynamicTrainer\([\s\S]*?const party = trainer\.party\.map\(materializePokemon\);[\s\S]*?selectMaplessNormalEventExtraTrainerType[\s\S]*?planMaplessNormalEventExtraTrainerEncounter[\s\S]*?party\.push\(extraPokemon\)/,
  "ordinary trainer generation must complete before the separate extra encounter append");
assert.match(combat,
  /const combatKind = battleEvent\.extra_pokemon === true \? "both" : "trainer"/,
  "extra-pokemon Battle must demand both the existing trainer and GENERAL encounter owners");
assert.match(combat,
  /for \(const unsupported of \["cannot_run", "strong_ai"\]\)/,
  "unsupported normal-event trainer constraints must remain fail-closed");
assert.match(combat,
  /if \(hadEncounterCounter\) state\.preview_encounter_counter = previousEncounterCounter;/,
  "failed extra-pokemon Battle start must roll back the shared/global type-selection stream");
assert.doesNotMatch(combat,
  /generateSafariDynamicTrainer\(\{[\s\S]{0,220}(?:partySize|party_size).*extra_pokemon/,
  "extra_pokemon must never be folded into dynamic trainer party-size generation");

console.log("Safari normal-event extra trainer Pokemon boundary smoke passed");
