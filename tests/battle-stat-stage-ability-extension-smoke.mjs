import assert from "node:assert/strict";

import {
  BATTLE_STAT_STAGE_ABILITY_COVERAGE_CANONICAL,
  resolveBattleStatStageAbilityChangeCanonical,
} from "../runtime/battle-core-stat-stage-ability-extension.js";

const pokemon = (ability = "NONE", extra = {}) => ({ ability, ...extra });
const change = (delta) => ({ subject: "target", stat: "ATTACK", delta });

{
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: pokemon("SIMPLE"),
    change: change(1),
    sourceKind: "self",
  });
  assert.equal(result.change.delta, 2);
  assert.equal(result.modified, true);
  assert.equal(result.source, "SIMPLE");
}

{
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: pokemon("SIMPLE"),
    change: change(-2),
    sourceKind: "opposing_move",
  });
  assert.equal(result.change.delta, -4);
}

{
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: pokemon("CONTRARY"),
    change: change(-1),
    sourceKind: "opposing_move",
  });
  assert.equal(result.change.delta, 1);
  assert.equal(result.source, "CONTRARY");
}

{
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: pokemon("CONTRARY"),
    change: change(2),
    sourceKind: "self",
  });
  assert.equal(result.change.delta, -2);
}

for (const ability of ["SIMPLE", "CONTRARY"]) {
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: pokemon(ability),
    change: change(-1),
    sourceKind: "opposing_move",
    moldBreaker: true,
  });
  assert.equal(result.change.delta, -1);
  assert.equal(result.modified, false);
  assert.equal(result.abilityIgnored, true);
}

{
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: pokemon("CONTRARY"),
    change: change(-1),
    sourceKind: "self",
    moldBreaker: true,
  });
  assert.equal(result.change.delta, 1);
  assert.equal(result.abilityIgnored, false);
}

{
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: { ability: null, ability_id: "CONTRARY" },
    change: change(-1),
    sourceKind: "self",
  });
  assert.equal(result.change.delta, -1);
  assert.equal(result.source, null);
}

{
  const result = resolveBattleStatStageAbilityChangeCanonical({
    pokemon: { ability_id: "SIMPLE" },
    change: change(1),
    sourceKind: "self",
  });
  assert.equal(result.change.delta, 2);
}

assert.deepEqual(BATTLE_STAT_STAGE_ABILITY_COVERAGE_CANONICAL.abilityIds, ["CONTRARY", "SIMPLE"]);
assert.equal(BATTLE_STAT_STAGE_ABILITY_COVERAGE_CANONICAL.abilityCount, 2);
assert.equal(BATTLE_STAT_STAGE_ABILITY_COVERAGE_CANONICAL.classificationCounts.statStageChangeModifierAbilities, 2);

console.log("battle stat-stage ability extension smoke: PASS");
