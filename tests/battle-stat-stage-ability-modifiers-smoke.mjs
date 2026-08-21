import assert from "node:assert/strict";
import {
  BATTLE_STAT_STAGE_ABILITY_COVERAGE_CANONICAL,
  resolveBattleStatStageAbilityChangeCanonical,
} from "../runtime/battle-core-stat-stage-ability-modifiers.js";

const pokemon = (ability, extra = {}) => ({ ability, ...extra });

{
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: pokemon("CONTRARY"),
    delta: -1,
  });
  assert.equal(result.delta, 1);
  assert.equal(result.modified, true);
  assert.equal(result.source, "CONTRARY");
}

{
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: pokemon("CONTRARY"),
    delta: 2,
  });
  assert.equal(result.delta, -2);
}

{
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: pokemon("SIMPLE"),
    delta: 2,
  });
  assert.equal(result.delta, 4);
  assert.equal(result.modified, true);
  assert.equal(result.source, "SIMPLE");
}

{
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: pokemon("SIMPLE"),
    delta: -1,
  });
  assert.equal(result.delta, -2);
}

// Mold Breaker/Teravolt/Turboblaze ignore the target's Contrary/Simple for
// opponent-caused stage changes, but not for the user's own stage changes.
for (const ability of ["CONTRARY", "SIMPLE"]) {
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: pokemon(ability),
    delta: -1,
    abilityIgnored: true,
  });
  assert.equal(result.delta, -1);
  assert.equal(result.modified, false);
}

// Canonical Pokemon Runtime fields are authoritative. Null means no Ability;
// the legacy alias is only used when the canonical field itself is absent.
{
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: { ability: null, ability_id: "CONTRARY" },
    delta: -1,
  });
  assert.equal(result.delta, -1);
}
{
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: { ability_id: "CONTRARY" },
    delta: -1,
  });
  assert.equal(result.delta, 1);
}

assert.deepEqual(BATTLE_STAT_STAGE_ABILITY_COVERAGE_CANONICAL.abilityIds, ["CONTRARY", "SIMPLE"]);
assert.equal(BATTLE_STAT_STAGE_ABILITY_COVERAGE_CANONICAL.abilityCount, 2);
assert.equal(BATTLE_STAT_STAGE_ABILITY_COVERAGE_CANONICAL.classificationCounts.statStageDirectionAbilities, 1);
assert.equal(BATTLE_STAT_STAGE_ABILITY_COVERAGE_CANONICAL.classificationCounts.statStageMagnitudeAbilities, 1);

console.log("battle stat-stage ability modifiers smoke: PASS");
