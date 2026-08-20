import assert from "node:assert/strict";
import {
  BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL,
  resolveContactReactiveAbilityItemHookCanonical,
} from "../runtime/battle-core-contact-reactive-extension.js";
import { resolveBattleAbilityItemHookCanonical } from "../runtime/battle-ability-item-hook-dispatch.js";

function pokemon({ ability = "NONE", heldItem = null, hp = 100, maxHp = 100, legacyItem } = {}) {
  const result = {
    ability,
    held_item: heldItem,
    hp,
    max_hp: maxHp,
  };
  if (legacyItem !== undefined) result.item = legacyItem;
  return result;
}

function contact(targetAbility, overrides = {}) {
  return resolveContactReactiveAbilityItemHookCanonical({
    user: pokemon(overrides.user),
    target: pokemon({ ability: targetAbility, ...(overrides.target ?? {}) }),
    move: { id: "TACKLE", contact: true },
    damageDealt: 20,
    context: { hit: true, contact: true, ...(overrides.context ?? {}) },
  });
}

{
  const result = contact("STATIC");
  assert.deepEqual(result.statusChanceRequest, {
    subject: "user",
    status: "PARALYSIS",
    chance: 30,
    source: "STATIC",
    sourceKind: "ability",
  });
  assert.equal(result.offensiveStatusChanceRequest, null);
  assert.deepEqual(result.statChanges, []);
}

{
  assert.equal(contact("FLAMEBODY").statusChanceRequest.status, "BURN");
  assert.equal(contact("POISONPOINT").statusChanceRequest.status, "POISON");
}

{
  const poisonTouch = contact("NONE", { user: { ability: "POISONTOUCH" } });
  assert.equal(poisonTouch.statusChanceRequest, null);
  assert.deepEqual(poisonTouch.offensiveStatusChanceRequest, {
    subject: "target",
    status: "POISON",
    chance: 30,
    source: "POISONTOUCH",
    sourceKind: "ability",
  });
  assert.equal(poisonTouch.triggered, true);
}

{
  const poisonTouchMiss = contact("NONE", {
    user: { ability: "POISONTOUCH" },
    context: { hit: false },
  });
  assert.equal(poisonTouchMiss.offensiveStatusChanceRequest, null);

  const poisonTouchNoContact = contact("NONE", {
    user: { ability: "POISONTOUCH" },
    context: { contact: false },
  });
  assert.equal(poisonTouchNoContact.offensiveStatusChanceRequest, null);
}

{
  const poisonTouchLongReach = contact("NONE", { user: { ability: "POISONTOUCH" } });
  assert.equal(poisonTouchLongReach.offensiveStatusChanceRequest.status, "POISON", "Poison Touch is the attacker's own contact effect and must not be suppressed by its own ability source");

  const poisonTouchPads = contact("NONE", {
    user: { ability: "POISONTOUCH", heldItem: "PROTECTIVEPADS" },
  });
  assert.equal(poisonTouchPads.offensiveStatusChanceRequest, null, "Protective Pads suppress contact effects caused by making contact");
}

{
  const tanglingHair = contact("TANGLINGHAIR");
  assert.equal(tanglingHair.statusChanceRequest, null);
  assert.deepEqual(tanglingHair.statChanges, [{
    subject: "user",
    stat: "SPEED",
    delta: -1,
    source: "TANGLINGHAIR",
    sourceKind: "ability",
  }]);
  assert.deepEqual(contact("GOOEY").statChanges[0], {
    subject: "user",
    stat: "SPEED",
    delta: -1,
    source: "GOOEY",
    sourceKind: "ability",
  });
}

{
  const longReach = contact("STATIC", { user: { ability: "LONGREACH" } });
  assert.equal(longReach.protectedFromContactEffects, true);
  assert.equal(longReach.statusChanceRequest, null);
  assert.deepEqual(longReach.statChanges, []);

  const protectivePads = contact("FLAMEBODY", { user: { heldItem: "PROTECTIVEPADS" } });
  assert.equal(protectivePads.statusChanceRequest, null);
}

{
  const magicGuard = contact("STATIC", { user: { ability: "MAGICGUARD" } });
  assert.equal(magicGuard.magicGuard, true);
  assert.equal(magicGuard.statusChanceRequest.status, "PARALYSIS", "Magic Guard only suppresses indirect damage, not contact status reactions");

  const roughSkin = contact("ROUGHSKIN", { user: { ability: "MAGICGUARD" } });
  assert.equal(roughSkin.userHpDelta, 0);
}

{
  const noHit = contact("STATIC", { context: { hit: false } });
  assert.equal(noHit.statusChanceRequest, null);
  const noContact = contact("GOOEY", { context: { contact: false } });
  assert.deepEqual(noContact.statChanges, []);
}

{
  const consumedPads = contact("STATIC", {
    user: { heldItem: null, legacyItem: "PROTECTIVEPADS" },
  });
  assert.equal(consumedPads.protectedFromContactEffects, false, "held_item=null must remain authoritative over stale item alias");
  assert.equal(consumedPads.statusChanceRequest.status, "PARALYSIS");
}

{
  const shared = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon({ ability: "POISONTOUCH" }),
    target: pokemon({ ability: "STATIC" }),
    move: { id: "TACKLE", contact: true },
    damageDealt: 20,
    context: { hit: true, contact: true },
  });
  assert.equal(shared.contactReactive.statusChanceRequest.status, "PARALYSIS");
  assert.equal(shared.contactReactive.offensiveStatusChanceRequest.status, "POISON");
}

assert.equal(BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL.classificationCounts.contactStatusChanceAbilities, 3);
assert.equal(BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL.classificationCounts.offensiveContactStatusChanceAbilities, 1);
assert.equal(BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL.classificationCounts.contactStatStageAbilities, 2);
assert.ok(BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL.abilityIds.includes("STATIC"));
assert.ok(BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL.abilityIds.includes("GOOEY"));
assert.ok(BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL.abilityIds.includes("POISONTOUCH"));

console.log("battle contact status/stat-stage reactions smoke: PASS");
