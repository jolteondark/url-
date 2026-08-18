import { RubyMT19937Random } from "./ruby-mt19937-random.js";

export const ACCURACY_BODY_SHA256 = "55a2d0be4286dfa8624828bbf9899ed7760c9c15a2a1689ff01f0e89ea7d3517";
export const DAMAGE_MULTIPLIERS_BODY_SHA256 = "d4c7c2e7dd7237f911b20f61ca809a6e08087695d17a2dc335ae197b4b327b39";
export const CRITICAL_BODY_SHA256 = "d0b192903ddae375019a6310cb45d59b4f6c3e45f69b919b0fd0d45830644132";

function materializeAction(action, rng, criticalRng) {
  const prepared = structuredClone(action ?? {});
  const rolls = [];
  if (prepared.accuracyInput && prepared.accuracyInput.randomRoll === undefined) {
    const value = rng.randInt(100);
    prepared.accuracyInput.randomRoll = value;
    rolls.push({ kind: "accuracy", limit: 100, value, sourceSymbol: "Battle::Move#pbAccuracyCheck", sourceBodySha256: ACCURACY_BODY_SHA256 });
  }
  if (prepared.damageInput && prepared.damageInput.criticalInput === undefined) {
    const value = criticalRng.randInt(24);
    prepared.damageInput.criticalInput = { randomRoll: value };
    rolls.push({ kind: "critical", limit: 24, value, sourceSymbol: "Battle::Move#pbIsCritical?", sourceBodySha256: CRITICAL_BODY_SHA256 });
  }
  if (prepared.damageInput?.damageMultiplierInput && prepared.damageInput.damageMultiplierInput.randomRoll === undefined && !prepared.damageInput.damageMultiplierInput.confusionMove) {
    const value = rng.randInt(16);
    prepared.damageInput.damageMultiplierInput.randomRoll = value;
    rolls.push({ kind: "damage_variance", limit: 16, value, sourceSymbol: "Battle::Move#pbCalcDamageMultipliers", sourceBodySha256: DAMAGE_MULTIPLIERS_BODY_SHA256 });
  }
  if (rolls.length) prepared.seededAccuracyDamageRolls = rolls;
  return prepared;
}

export function materializeSeededAccuracyDamageCanonical(input = {}) {
  const seed = Number(input.combatRandomSeed ?? 0) & 0x7fffffff;
  const rng = new RubyMT19937Random(seed);
  // Critical hit rate/projection stays owned by Battle::Move#pbIsCritical?.
  // Use a deterministic sibling MT stream so adding the previously-missing
  // ordinary critical roll does not silently rewrite the established seeded
  // accuracy/damage-variance transcript before the full canonical Battle RNG
  // stream is composed end-to-end.
  const criticalRng = new RubyMT19937Random((seed ^ 0x43524954) >>> 0);
  const rounds = (Array.isArray(input.rounds) ? input.rounds : []).map((round) => ({
    ...round,
    actions: (Array.isArray(round.actions) ? round.actions : []).map((action) => materializeAction(action, rng, criticalRng)),
  }));
  return { ...input, combatRandomSeed: seed, rounds };
}
