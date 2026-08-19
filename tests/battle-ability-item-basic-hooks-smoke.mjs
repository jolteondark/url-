import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_IMPLEMENTED_COVERAGE_CANONICAL,
  resolveAbilityItemActionModifiersCanonical,
  resolveAbilityStatusEligibilityCanonical,
  resolveActionAfterAbilityItemHookCanonical,
  resolveActionBeforeAbilityItemHookCanonical,
  resolveChoiceLockCanonical,
  resolveEntryAbilityStatEffectCanonical,
  resolveHpThresholdBerryHookCanonical,
  resolveSurvivalAbilityItemHookCanonical,
  resolveSwitchInAbilityItemHookCanonical,
  resolveTurnEndAbilityItemHookCanonical,
  resolveTypeImmunityAbilityEffectCanonical,
} from "../runtime/battle-core-ability-item-modifiers.js";
import { resolveHeldItemLifecycle } from "../runtime/battle-held-item-consumption-flow.js";

const pokemon = (ability = "NONE", item = null, extra = {}) => ({
  ability,
  item,
  held_item: item,
  status: "NONE",
  hp: 100,
  max_hp: 100,
  types: ["NORMAL"],
  stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: 100 },
  ...extra,
});

{
  const result = resolveTypeImmunityAbilityEffectCanonical({
    user: pokemon("NONE"), target: pokemon("WATERABSORB"), move: { type: "WATER" },
  });
  assert.equal(result.immune, true);
  assert.deepEqual(result.afterEffect.hpFraction, [1, 4]);
  const bypass = resolveTypeImmunityAbilityEffectCanonical({
    user: pokemon("MOLDBREAKER"), target: pokemon("WATERABSORB"), move: { type: "WATER" },
  });
  assert.equal(bypass.immune, false, "Mold Breaker must bypass shared ability immunity");
  const rod = resolveTypeImmunityAbilityEffectCanonical({
    user: pokemon("NONE"), target: pokemon("LIGHTNINGROD"), move: { type: "ELECTRIC" },
  });
  assert.equal(rod.afterEffect.changes[0].stat, "SPECIAL_ATTACK");
}

{
  const hugePower = resolveAbilityItemActionModifiersCanonical({
    user: pokemon("HUGEPOWER"), target: pokemon(), move: { type: "NORMAL", category: "Physical", power: 80 },
  });
  assert.equal(hugePower.damageMultiplierInput.externalAttackMultiplier, 2);
  const blaze = resolveAbilityItemActionModifiersCanonical({
    user: pokemon("BLAZE", null, { hp: 30, max_hp: 100 }), target: pokemon(), move: { type: "FIRE", category: "Special", power: 80 },
  });
  assert.equal(blaze.damageMultiplierInput.externalPowerMultiplier, 1.5);
  const furCoat = resolveAbilityItemActionModifiersCanonical({
    user: pokemon(), target: pokemon("FURCOAT"), move: { type: "NORMAL", category: "Physical", power: 80 },
  });
  assert.equal(furCoat.damageMultiplierInput.externalDefenseMultiplier, 2);
  const wideLens = resolveAbilityItemActionModifiersCanonical({
    user: pokemon("NONE", "WIDELENS"), target: pokemon(), move: { category: "Status", power: 0 },
  });
  assert.equal(wideLens.accuracyModifierInput.externalAccuracyMultiplier, 1.1);
  const noGuard = resolveAbilityItemActionModifiersCanonical({
    user: pokemon("NOGUARD"), target: pokemon(), move: { category: "Physical", power: 80 },
  });
  assert.equal(noGuard.noGuard, true);
  const secondary = resolveAbilityItemActionModifiersCanonical({
    user: pokemon("SERENEGRACE"), target: pokemon("SHIELDDUST"), move: { category: "Physical", power: 60 },
  });
  assert.equal(secondary.secondaryEffectInput.userHasSereneGrace, true);
  assert.equal(secondary.secondaryEffectInput.targetHasShieldDust, true);
}

{
  const purifyingSalt = resolveAbilityStatusEligibilityCanonical({ target: pokemon("PURIFYINGSALT"), newStatus: "BURN" });
  assert.equal(purifyingSalt.statusImmunityAbility, true);
  const thermalExchange = resolveAbilityStatusEligibilityCanonical({ target: pokemon("THERMALEXCHANGE"), newStatus: "BURN" });
  assert.equal(thermalExchange.statusImmunityAbility, true);
}

{
  const intimidate = resolveSwitchInAbilityItemHookCanonical({ user: pokemon("INTIMIDATE"), target: pokemon() });
  assert.equal(intimidate.entry.changes[0].stat, "ATTACK");
  assert.equal(intimidate.entry.changes[0].delta, -1);
  const download = resolveEntryAbilityStatEffectCanonical({
    user: pokemon("DOWNLOAD"),
    target: pokemon("NONE", null, { stats: { DEFENSE: 120, SPECIAL_DEFENSE: 80 } }),
  });
  assert.equal(download.changes[0].stat, "SPECIAL_ATTACK");
}

{
  const first = resolveChoiceLockCanonical({ pokemon: pokemon("NONE", "CHOICEBAND"), selectedMoveId: "TACKLE" });
  assert.equal(first.allowed, true);
  assert.equal(first.lockedMoveId, "TACKLE");
  const blocked = resolveChoiceLockCanonical({ pokemon: pokemon("NONE", "CHOICEBAND"), selectedMoveId: "BITE", lockedMoveId: first.lockedMoveId });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "choice_lock");
  const gorilla = resolveActionBeforeAbilityItemHookCanonical({
    user: pokemon("GORILLATACTICS"), target: pokemon(), move: { id: "TACKLE", category: "Physical", power: 40 }, selectedMoveId: "TACKLE",
  });
  assert.equal(gorilla.choiceLock.active, true);
  assert.equal(gorilla.modifiers.damageMultiplierInput.externalAttackMultiplier, 1.5);
}

{
  const leftovers = resolveTurnEndAbilityItemHookCanonical(pokemon("NONE", "LEFTOVERS", { hp: 80, max_hp: 160 }));
  assert.equal(leftovers.hpDelta, 10);
  const sludgeHeal = resolveTurnEndAbilityItemHookCanonical(pokemon("NONE", "BLACKSLUDGE", { hp: 80, max_hp: 160, types: ["POISON"] }));
  assert.equal(sludgeHeal.hpDelta, 10);
  const sludgeDamage = resolveTurnEndAbilityItemHookCanonical(pokemon("NONE", "BLACKSLUDGE", { hp: 80, max_hp: 160, types: ["NORMAL"] }));
  assert.equal(sludgeDamage.hpDelta, -20);
  const poisonHeal = resolveTurnEndAbilityItemHookCanonical(pokemon("POISONHEAL", null, { hp: 80, max_hp: 160, status: "POISON" }));
  assert.equal(poisonHeal.hpDelta, 20);
  const speedBoost = resolveTurnEndAbilityItemHookCanonical(pokemon("SPEEDBOOST"));
  assert.equal(speedBoost.statChanges[0].stat, "SPEED");
  const toxicOrb = resolveTurnEndAbilityItemHookCanonical(pokemon("NONE", "TOXICORB"));
  assert.equal(toxicOrb.statusRequest.status, "POISON");
}

{
  const sitrus = resolveHpThresholdBerryHookCanonical(pokemon("NONE", "SITRUSBERRY", { hp: 40, max_hp: 100 }));
  assert.equal(sitrus.heal, 25);
  const liechi = resolveHpThresholdBerryHookCanonical(pokemon("NONE", "LIECHIBERRY", { hp: 25, max_hp: 100 }));
  assert.equal(liechi.statChanges[0].stat, "ATTACK");
  const figy = resolveHpThresholdBerryHookCanonical(pokemon("NONE", "FIGYBERRY", { hp: 25, max_hp: 120 }));
  assert.equal(figy.heal, 40);
  assert.equal(figy.confusionCheckRequired, true);
  const lifecycle = resolveHeldItemLifecycle({
    state: { item: "SITRUSBERRY", pokemonItem: "SITRUSBERRY", initialItem: "SITRUSBERRY" },
    ...sitrus.consumeRequest,
  });
  assert.equal(lifecycle.state.pokemonItem, null, "consumed berries must clear the Pokemon Runtime held item");
  assert.equal(lifecycle.state.initialItem, null, "permanent consumption must prevent save/continue resurrection");
}

{
  const lifeOrb = resolveActionAfterAbilityItemHookCanonical({
    user: pokemon("NONE", "LIFEORB", { hp: 100, max_hp: 100 }), target: pokemon(), move: { category: "Physical" }, damageDealt: 40,
  });
  assert.equal(lifeOrb.userHpDelta, -10);
  const shellBell = resolveActionAfterAbilityItemHookCanonical({
    user: pokemon("NONE", "SHELLBELL", { hp: 50, max_hp: 100 }), target: pokemon(), move: { category: "Special" }, damageDealt: 40,
  });
  assert.equal(shellBell.userHpDelta, 5);
}

{
  const sturdy = resolveSurvivalAbilityItemHookCanonical({ target: pokemon("STURDY"), incomingDamage: 120 });
  assert.equal(sturdy.triggered, true);
  assert.equal(sturdy.damage, 99);
  const bypass = resolveSurvivalAbilityItemHookCanonical({ target: pokemon("STURDY"), incomingDamage: 120, moldBreaker: true });
  assert.equal(bypass.triggered, false);
  const sash = resolveSurvivalAbilityItemHookCanonical({ target: pokemon("NONE", "FOCUSSASH"), incomingDamage: 120 });
  assert.equal(sash.triggered, true);
  const consumed = resolveHeldItemLifecycle({
    state: { item: "FOCUSSASH", pokemonItem: "FOCUSSASH", initialItem: "FOCUSSASH" },
    ...sash.consumeRequest,
  });
  assert.equal(consumed.state.pokemonItem, null);
  assert.equal(consumed.state.initialItem, null);
}

assert.ok(BATTLE_ABILITY_ITEM_IMPLEMENTED_COVERAGE_CANONICAL.abilityCount >= 60);
assert.ok(BATTLE_ABILITY_ITEM_IMPLEMENTED_COVERAGE_CANONICAL.itemCount >= 30);
assert.ok(BATTLE_ABILITY_ITEM_IMPLEMENTED_COVERAGE_CANONICAL.classificationCounts.typeImmunityOrAbsorb >= 10);

console.log("battle ability/item basic hooks smoke: PASS");
