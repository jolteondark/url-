import assert from "node:assert/strict";
import { SAFARI_MOVE_MASTERS } from "../runtime/safari-playable-data.js";
import { prepareReflectedMajorStatusBattleInput } from "../runtime/battle-major-status-runtime-preparation.js";
import { commitBattleSystemsStatusRuntime } from "../runtime/battle-status-runtime-integration.js";
import { materializeSeededSecondaryEffectsCanonical } from "../runtime/battle-core-seeded-secondary-effect.js";

SAFARI_MOVE_MASTERS.STUNSPORE = Object.freeze({
  id: "STUNSPORE",
  name: "Stun Spore",
  category: "Status",
  power: 0,
  accuracy: 75,
  total_pp: 30,
  priority: 0,
  type: "GRASS",
  function_code: "ParalyzeTarget",
});
SAFARI_MOVE_MASTERS.POISONPOWDER = Object.freeze({
  id: "POISONPOWDER",
  name: "Poison Powder",
  category: "Status",
  power: 0,
  accuracy: 75,
  total_pp: 35,
  priority: 0,
  type: "POISON",
  function_code: "PoisonTarget",
});
SAFARI_MOVE_MASTERS.THUNDERSHOCK = Object.freeze({
  id: "THUNDERSHOCK",
  name: "Thunder Shock",
  category: "Special",
  power: 40,
  accuracy: 100,
  total_pp: 30,
  priority: 0,
  type: "ELECTRIC",
  effect_chance: 10,
  function_code: "ParalyzeTarget",
});
SAFARI_MOVE_MASTERS.ICEBEAM = Object.freeze({
  id: "ICEBEAM",
  name: "Ice Beam",
  category: "Special",
  power: 90,
  accuracy: 100,
  total_pp: 10,
  priority: 0,
  type: "ICE",
  effect_chance: 10,
  function_code: "FreezeTarget",
});
SAFARI_MOVE_MASTERS.FREEZEDRY = Object.freeze({
  id: "FREEZEDRY",
  name: "Freeze-Dry",
  category: "Special",
  power: 70,
  accuracy: 100,
  total_pp: 20,
  priority: 0,
  type: "ICE",
  effect_chance: 10,
  function_code: "FreezeTargetSuperEffectiveAgainstWater",
});
SAFARI_MOVE_MASTERS.THUNDER = Object.freeze({
  id: "THUNDER",
  name: "Thunder",
  category: "Special",
  power: 110,
  accuracy: 70,
  total_pp: 10,
  priority: 0,
  type: "ELECTRIC",
  effect_chance: 30,
  function_code: "ParalyzeTargetAlwaysHitsInRainHitsTargetInSky",
});
SAFARI_MOVE_MASTERS.FLAREBLITZ = Object.freeze({
  id: "FLAREBLITZ",
  name: "Flare Blitz",
  category: "Physical",
  power: 120,
  accuracy: 100,
  total_pp: 15,
  priority: 0,
  type: "FIRE",
  effect_chance: 10,
  function_code: "RecoilThirdOfDamageDealtBurnTarget",
});

const pokemon = ({ species = "EEVEE", types = ["NORMAL"], status = "NONE" } = {}) => ({
  species,
  level: 20,
  hp: 50,
  max_hp: 50,
  status,
  status_count: 0,
  types,
  stats: { ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
  moves: [],
});

const actionFor = (moveId, accuracy = 75) => ({
  rounds: [{ actions: [{
    kind: "move",
    battlerIndex: 0,
    targetBattlerIndex: 1,
    moveId,
    accuracyInput: { baseAccuracy: accuracy, randomRoll: 0 },
  }] }],
});

const executedTurn = { operations: [{ op: "use_move", round: 1, action: 0 }] };

const ground = pokemon({ species: "SANDSHREW", types: ["GROUND"] });
const stunPrepared = prepareReflectedMajorStatusBattleInput({
  battleInput: actionFor("STUNSPORE"),
  pokemon: ground,
  reflectedBattlerIndex: 1,
});
assert.equal(stunPrepared.rounds[0].actions[0].battleStatusInput?.newStatus, "PARALYSIS",
  "Stun Spore must use status eligibility rather than Electric-style move type immunity");
assert.equal(stunPrepared.rounds[0].actions[0].majorStatusEffectResolution?.typeResolution, undefined);
stunPrepared.rounds[0].actions[0].accuracyResolution = { hit: true };
const stunCommit = commitBattleSystemsStatusRuntime({
  battleInput: stunPrepared,
  turn: executedTurn,
  pokemon: ground,
  reflectedBattlerIndex: 1,
});
assert.equal(stunCommit.pokemon.status, "PARALYSIS");

const electric = pokemon({ species: "PIKACHU", types: ["ELECTRIC"] });
const electricPrepared = prepareReflectedMajorStatusBattleInput({
  battleInput: actionFor("STUNSPORE"),
  pokemon: electric,
  reflectedBattlerIndex: 1,
});
assert.equal(electricPrepared.rounds[0].actions[0].battleStatusInput, undefined);
assert.equal(electricPrepared.rounds[0].actions[0].majorStatusEffectResolution?.reason, "type_immunity");

const poisonTarget = pokemon();
const poisonPrepared = prepareReflectedMajorStatusBattleInput({
  battleInput: actionFor("POISONPOWDER"),
  pokemon: poisonTarget,
  reflectedBattlerIndex: 1,
});
assert.equal(poisonPrepared.rounds[0].actions[0].battleStatusInput?.newStatus, "POISON");
poisonPrepared.rounds[0].actions[0].accuracyResolution = { hit: true };
const poisonCommit = commitBattleSystemsStatusRuntime({
  battleInput: poisonPrepared,
  turn: executedTurn,
  pokemon: poisonTarget,
  reflectedBattlerIndex: 1,
});
assert.equal(poisonCommit.pokemon.status, "POISON");

for (const types of [["POISON"], ["STEEL"]]) {
  const immune = pokemon({ types });
  const prepared = prepareReflectedMajorStatusBattleInput({
    battleInput: actionFor("POISONPOWDER"),
    pokemon: immune,
    reflectedBattlerIndex: 1,
  });
  assert.equal(prepared.rounds[0].actions[0].battleStatusInput, undefined);
  assert.equal(prepared.rounds[0].actions[0].majorStatusEffectResolution?.reason, "type_immunity");
}

// Damaging major-status FunctionCodes use the existing seeded secondary owner,
// then persist only if the move actually dealt damage.
const thunderInput = { ...actionFor("THUNDERSHOCK", 100), combatRandomSeed: 7 };
const damagingSecondary = prepareReflectedMajorStatusBattleInput({
  battleInput: thunderInput,
  pokemon: pokemon(),
  reflectedBattlerIndex: 1,
});
const damagingAction = damagingSecondary.rounds[0].actions[0];
assert.equal(damagingAction.battleStatusInput?.newStatus, "PARALYSIS");
assert.equal(damagingAction.battleStatusInput?.secondaryEffectTargetIndex, 0);
assert.equal(damagingAction.secondaryEffectInputs?.[0]?.effectChance, 10);
assert.equal(damagingAction.secondaryMajorStatusEffectResolution?.source?.functionCode, "ParalyzeTarget");
assert.ok(Number.isInteger(damagingSecondary.secondaryEffectRandomSeed));

damagingAction.secondaryEffectInputs[0].randomRoll = 0;
const triggered = materializeSeededSecondaryEffectsCanonical(damagingSecondary);
triggered.rounds[0].actions[0].accuracyResolution = { hit: true };
assert.equal(triggered.rounds[0].actions[0].secondaryEffectInputs[0].triggered, true);
const damagingTurn = { operations: [
  { op: "use_move", round: 1, action: 0 },
  { op: "reduce_hp", round: 1, action: 0, hpBefore: 50, hpAfter: 30, amount: 20 },
] };
const triggeredCommit = commitBattleSystemsStatusRuntime({
  battleInput: triggered,
  turn: damagingTurn,
  pokemon: pokemon(),
  reflectedBattlerIndex: 1,
});
assert.equal(triggeredCommit.pokemon.status, "PARALYSIS");

const noDamageCommit = commitBattleSystemsStatusRuntime({
  battleInput: triggered,
  turn: executedTurn,
  pokemon: pokemon(),
  reflectedBattlerIndex: 1,
});
assert.equal(noDamageCommit.pokemon.status, "NONE",
  "a triggered damaging secondary must not persist when the move dealt no damage");

const missedRollInput = prepareReflectedMajorStatusBattleInput({
  battleInput: thunderInput,
  pokemon: pokemon(),
  reflectedBattlerIndex: 1,
});
missedRollInput.rounds[0].actions[0].secondaryEffectInputs[0].randomRoll = 99;
const missedRoll = materializeSeededSecondaryEffectsCanonical(missedRollInput);
missedRoll.rounds[0].actions[0].accuracyResolution = { hit: true };
assert.equal(missedRoll.rounds[0].actions[0].secondaryEffectInputs[0].triggered, false);
const missedRollCommit = commitBattleSystemsStatusRuntime({
  battleInput: missedRoll,
  turn: damagingTurn,
  pokemon: pokemon(),
  reflectedBattlerIndex: 1,
});
assert.equal(missedRollCommit.pokemon.status, "NONE");

const thunderVsGround = prepareReflectedMajorStatusBattleInput({
  battleInput: thunderInput,
  pokemon: ground,
  reflectedBattlerIndex: 1,
});
assert.equal(thunderVsGround.rounds[0].actions[0].battleStatusInput, undefined,
  "Electric damaging secondary must not roll through Ground move immunity");
assert.equal(thunderVsGround.rounds[0].actions[0].secondaryMajorStatusEffectResolution?.reason, "move_type_immunity");

// FreezeTarget is another canonical damaging secondary. Reuse the same seeded
// owner and status eligibility; Ice targets are immune to FROZEN.
const iceBeamInput = { ...actionFor("ICEBEAM", 100), combatRandomSeed: 11 };
const freezePrepared = prepareReflectedMajorStatusBattleInput({
  battleInput: iceBeamInput,
  pokemon: pokemon(),
  reflectedBattlerIndex: 1,
});
const freezeAction = freezePrepared.rounds[0].actions[0];
assert.equal(freezeAction.battleStatusInput?.newStatus, "FROZEN");
assert.equal(freezeAction.secondaryEffectInputs?.[0]?.effectChance, 10);
assert.equal(freezeAction.secondaryMajorStatusEffectResolution?.source?.functionCode, "FreezeTarget");
freezeAction.secondaryEffectInputs[0].randomRoll = 0;
const freezeTriggered = materializeSeededSecondaryEffectsCanonical(freezePrepared);
freezeTriggered.rounds[0].actions[0].accuracyResolution = { hit: true };
const freezeCommit = commitBattleSystemsStatusRuntime({
  battleInput: freezeTriggered,
  turn: damagingTurn,
  pokemon: pokemon(),
  reflectedBattlerIndex: 1,
});
assert.equal(freezeCommit.pokemon.status, "FROZEN");

const iceTarget = pokemon({ species: "GLACEON", types: ["ICE"] });
const freezeImmune = prepareReflectedMajorStatusBattleInput({
  battleInput: iceBeamInput,
  pokemon: iceTarget,
  reflectedBattlerIndex: 1,
});
assert.equal(freezeImmune.rounds[0].actions[0].battleStatusInput, undefined);
assert.equal(freezeImmune.rounds[0].actions[0].secondaryMajorStatusEffectResolution?.reason, "type_immunity");

// Compound v0.9.108 FunctionCodes that carry one ordinary major-status
// additional effect must reuse the same seeded/status owner. The surrounding
// move mechanic (weather hit rule, water effectiveness, recoil, etc.) remains
// owned by its existing FunctionCode path.
for (const fixture of [
  { moveId: "FREEZEDRY", expectedStatus: "FROZEN", statusFunction: "FreezeTarget", canonicalFunction: "FreezeTargetSuperEffectiveAgainstWater" },
  { moveId: "THUNDER", expectedStatus: "PARALYSIS", statusFunction: "ParalyzeTarget", canonicalFunction: "ParalyzeTargetAlwaysHitsInRainHitsTargetInSky" },
  { moveId: "FLAREBLITZ", expectedStatus: "BURN", statusFunction: "BurnTarget", canonicalFunction: "RecoilThirdOfDamageDealtBurnTarget" },
]) {
  const compoundPrepared = prepareReflectedMajorStatusBattleInput({
    battleInput: { ...actionFor(fixture.moveId, 100), combatRandomSeed: 19 },
    pokemon: pokemon(),
    reflectedBattlerIndex: 1,
  });
  const compoundAction = compoundPrepared.rounds[0].actions[0];
  assert.equal(compoundAction.battleStatusInput?.newStatus, fixture.expectedStatus, `${fixture.moveId} must expose its embedded major status`);
  assert.equal(compoundAction.secondaryEffectInputs?.[0]?.functionCode, fixture.statusFunction);
  assert.equal(compoundAction.secondaryMajorStatusEffectResolution?.source?.canonicalFunctionCode, fixture.canonicalFunction);
  compoundAction.secondaryEffectInputs[0].randomRoll = 0;
  const compoundTriggered = materializeSeededSecondaryEffectsCanonical(compoundPrepared);
  compoundTriggered.rounds[0].actions[0].accuracyResolution = { hit: true };
  const compoundCommit = commitBattleSystemsStatusRuntime({
    battleInput: compoundTriggered,
    turn: damagingTurn,
    pokemon: pokemon(),
    reflectedBattlerIndex: 1,
  });
  assert.equal(compoundCommit.pokemon.status, fixture.expectedStatus, `${fixture.moveId} must commit through the shared status runtime`);
}

console.log("ordinary direct + damaging secondary major status owner smoke: ok");