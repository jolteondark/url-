import assert from "node:assert/strict";
import {
  resolveAbilityItemActionModifiersCanonical,
  resolveAbilityStatusEligibilityCanonical,
  resolveEntryAbilityStatEffectCanonical,
  resolveTurnEndHeldItemEffectCanonical,
  resolveHpBerryTriggerCanonical,
} from "../runtime/battle-core-ability-item-modifiers.js";
import { calcDamageMultipliersCanonical, accuracyCheckCanonical } from "../runtime/battle-core-accuracy-damage.js";
import { resolveBattleSpeedCanonical } from "../runtime/battle-core-speed.js";
import { canInflictMajorStatusCanonical } from "../runtime/battle-core-status-eligibility.js";
import { createBattleStatStageStateCanonical, applyBattleStatStageChangesCanonical } from "../runtime/battle-core-stat-stages.js";
import { resolveHeldItemLifecycle } from "../runtime/battle-held-item-consumption-flow.js";

const pokemon = (ability, item = null, extra = {}) => ({ ability, item, status: "NONE", hp: 100, max_hp: 100, ...extra });

{
  const modifiers = resolveAbilityItemActionModifiersCanonical({
    user: pokemon("ADAPTABILITY", "CHOICEBAND"),
    target: pokemon("NONE"),
    move: { type: "NORMAL", category: "Physical", power: 40 },
  });
  const damage = calcDamageMultipliersCanonical({
    type: "NORMAL", userHasType: true, typeMod: 1, physicalMove: true,
    ...modifiers.damageMultiplierInput,
  });
  assert.equal(damage.attackMultiplier, 1.5, "Choice Band must use the canonical attack multiplier input");
  assert.equal(damage.finalDamageMultiplier, 2, "Adaptability must upgrade STAB from 1.5x to 2x");
}

{
  const modifiers = resolveAbilityItemActionModifiersCanonical({
    user: pokemon("TECHNICIAN"), target: pokemon("NONE"),
    move: { type: "NORMAL", category: "Physical", power: 60 },
  });
  const damage = calcDamageMultipliersCanonical({ type: "NORMAL", userHasType: false, typeMod: 1, physicalMove: true, ...modifiers.damageMultiplierInput });
  assert.equal(damage.powerMultiplier, 1.5, "Technician must feed the existing power multiplier owner");
}

{
  const modifiers = resolveAbilityItemActionModifiersCanonical({
    user: pokemon("COMPOUNDEYES"), target: pokemon("NONE"),
    move: { category: "Special", power: 90 },
  });
  const accuracy = accuracyCheckCanonical({ baseAccuracy: 70, randomRoll: 80, accuracyModifierInput: modifiers.accuracyModifierInput });
  assert.equal(accuracy.hit, true, "Compound Eyes must increase the existing accuracy threshold");
  assert.equal(accuracy.accuracyModifierResolution.accuracyMultiplier, 1.3);
}

{
  const hustle = resolveAbilityItemActionModifiersCanonical({
    user: pokemon("HUSTLE"), target: pokemon("NONE"),
    move: { category: "Physical", power: 80 },
  });
  const accuracy = accuracyCheckCanonical({ baseAccuracy: 100, randomRoll: 90, accuracyModifierInput: hustle.accuracyModifierInput });
  assert.equal(accuracy.hit, false, "Hustle physical accuracy must use the existing accuracy owner");
}

{
  const modifiers = resolveAbilityItemActionModifiersCanonical({
    user: pokemon("QUICKFEET", "CHOICESCARF", { status: "POISON" }), target: pokemon("NONE"),
    move: { category: "Status", power: 0 },
  });
  const speed = resolveBattleSpeedCanonical({
    baseSpeed: 100, speedStage: 0, status: "POISON", mechanicsGeneration: 9,
    ...modifiers.speedInput,
  });
  assert.equal(speed, 225, "Quick Feet and Choice Scarf must compose in the shared speed owner");
}

{
  const levitate = resolveAbilityItemActionModifiersCanonical({
    user: pokemon("NONE"), target: pokemon("LEVITATE"), move: { type: "GROUND", category: "Physical", power: 80 },
  });
  assert.equal(levitate.typeImmunity, true, "Levitate must expose Ground immunity before damage");
  const moldBreaker = resolveAbilityItemActionModifiersCanonical({
    user: pokemon("MOLDBREAKER"), target: pokemon("LEVITATE"), move: { type: "GROUND", category: "Physical", power: 80 },
  });
  assert.equal(moldBreaker.typeImmunity, false, "Mold Breaker must bypass Levitate through the same modifier owner");
}

{
  const eligibility = resolveAbilityStatusEligibilityCanonical({ target: pokemon("LIMBER"), newStatus: "PARALYSIS" });
  const result = canInflictMajorStatusCanonical({ newStatus: "PARALYSIS", currentStatus: "NONE", targetTypes: ["NORMAL"], statusImmunityAbility: eligibility.statusImmunityAbility });
  assert.equal(result.canInflict, false);
  assert.equal(result.reason, "ability_immunity", "Limber must reuse canonical status eligibility");
}

{
  const entry = resolveEntryAbilityStatEffectCanonical({ user: pokemon("INTIMIDATE"), target: pokemon("NONE") });
  const applied = applyBattleStatStageChangesCanonical(createBattleStatStageStateCanonical(), entry.changes, 0, 1);
  assert.equal(applied.state[1].ATTACK, -1, "Intimidate entry request must be applied by the shared stat-stage owner");
  const blocked = resolveEntryAbilityStatEffectCanonical({ user: pokemon("INTIMIDATE"), target: pokemon("INNERFOCUS") });
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.changes.length, 0);
}

{
  const leftovers = resolveTurnEndHeldItemEffectCanonical(pokemon("NONE", "LEFTOVERS", { hp: 50, max_hp: 160 }));
  assert.deepEqual(leftovers, { item: "LEFTOVERS", triggered: true, heal: 10, boundary: "turn_end" });
}

{
  const berry = resolveHpBerryTriggerCanonical(pokemon("NONE", "SITRUSBERRY", { hp: 40, max_hp: 100 }));
  assert.equal(berry.triggered, true);
  assert.equal(berry.heal, 25);
  assert.equal(berry.consumeRequest.item, "SITRUSBERRY");
  const lifecycle = resolveHeldItemLifecycle({
    state: { item: "SITRUSBERRY", pokemonItem: "SITRUSBERRY", initialItem: "SITRUSBERRY" },
    ...berry.consumeRequest,
  });
  assert.equal(lifecycle.result, "consumed");
  assert.equal(lifecycle.state.pokemonItem, null, "the existing held-item lifecycle must remain the sole removal owner");
  assert.ok(lifecycle.operations.some((operation) => operation.op === "runtime_held_item_reflection" && operation.item === null));
}

console.log("battle ability/item modifier smoke: PASS");
