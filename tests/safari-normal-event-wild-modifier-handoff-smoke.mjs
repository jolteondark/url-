import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { resolveGeneralWildEncounter } from "../runtime/general-wild-encounter-resolver.js";

const sharedStartSource = readFileSync(new URL("../runtime/safari-web-combat-start.js", import.meta.url), "utf8");
assert.match(
  sharedStartSource,
  /extraModifier:\s*wildEncounterExtraModifier\(event\)/,
  "shared Safari wild start must forward the canonical event modifier into the existing encounter owner",
);

const common = {
  day: 6,
  requiredType: "BUG",
  enemyRank: "NORMAL",
  speciesRoll: 0.125,
  varianceRoll: 0.5,
};
const defaultEncounter = resolveGeneralWildEncounter({ ...common, extraModifier: 0 });
const honeyTreeEncounter = resolveGeneralWildEncounter({ ...common, extraModifier: 1 });
const unchangedZero = resolveGeneralWildEncounter({ ...common });

assert.equal(
  honeyTreeEncounter.scaling.effectiveScaling,
  defaultEncounter.scaling.effectiveScaling + 1,
  "canonical modifier:1 must add exactly one encounter scaling step",
);
assert.ok(
  honeyTreeEncounter.scaling.baseLevel > defaultEncounter.scaling.baseLevel,
  "modifier:1 must produce a stronger canonical wild encounter than modifier:0 at the same day/rolls",
);
assert.deepEqual(
  unchangedZero,
  defaultEncounter,
  "events without a modifier must preserve the previous modifier-0 encounter contract",
);

console.log("Safari normal-event wild modifier shared handoff: PASS");
