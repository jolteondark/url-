import assert from "node:assert/strict";
import fs from "node:fs";

import { resolveSafariNormalEventTrainerSkillLevel } from "../runtime/safari-web-combat-start.js";

const combatStart = fs.readFileSync(new URL("../runtime/safari-web-combat-start.js", import.meta.url), "utf8");
const playableLegacy = fs.readFileSync(new URL("../runtime/safari-playable-integration-legacy.js", import.meta.url), "utf8");

assert.equal(resolveSafariNormalEventTrainerSkillLevel(60, false), 60);
assert.equal(resolveSafariNormalEventTrainerSkillLevel(60, true), 75);
assert.equal(resolveSafariNormalEventTrainerSkillLevel(95, true), 100);

assert.doesNotMatch(
  combatStart,
  /constraint is not yet owned[^\n]*strong_ai/,
  "canonical strong_ai must not remain fail-closed after mapping to the shared trainer skill policy",
);
assert.match(
  combatStart,
  /state\.battle\.skill_level\s*=\s*resolveSafariNormalEventTrainerSkillLevel\(trainer\.skill_level,\s*event\?\.strong_ai === true\)/,
  "normal-event trainer launch must write canonical strong_ai into the shared battle skill_level seam",
);
assert.match(
  playableLegacy,
  /battle\?\.skill_level/,
  "shared trainer opponent move selection must continue to consume battle.skill_level",
);
assert.match(
  playableLegacy,
  /resolveTrainerMoveChoiceCanonical/,
  "trainer action selection must remain owned by the canonical shared AI resolver",
);

console.log("normal-event trainer strong_ai shared owner smoke: ok");
