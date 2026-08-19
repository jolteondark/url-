import { RubyMT19937Random } from "./ruby-mt19937-random.js";

export const PROCESS_MOVE_HIT_BODY_SHA256 = "f7dd4f09b10c8d0bb77f807ba47bda383b271f65ecc68995a8098242ffc3bf83";
export const ADDITIONAL_EFFECT_CHANCE_BODY_SHA256 = "31c12c36d367802cc2a799d6285d858a38ab8f8132f92d5b51f8b44e961b7129";

export function resolveAdditionalEffectChanceCanonical(input = {}) {
  if (input.targetHasShieldDust && !input.moldBreaker) return 0;
  let chance = Number(input.effectChance ?? 0) > 0
    ? Number(input.effectChance)
    : Number(input.moveAdditionalEffect ?? 0);
  if (chance > 100) return chance;
  const generationAllowsBoost = Number(input.mechanicsGeneration ?? 0) >= 6 || input.functionCode !== "EffectDependsOnEnvironment";
  if (generationAllowsBoost && (input.userHasSereneGrace || Number(input.rainbowTurns ?? 0) > 0)) chance *= 2;
  if (input.debugControlPressed) chance = 100;
  return chance;
}

function materializeSecondaryTarget(targetInput, rng, rolls, targetIndex) {
  const target = structuredClone(targetInput ?? {});
  const chance = target.chance === undefined ? resolveAdditionalEffectChanceCanonical(target) : Number(target.chance);
  target.chance = chance;
  const eligible = Number(target.calcDamage ?? 0) !== 0 && chance > 0;
  if (!eligible) {
    target.triggered = false;
    return target;
  }
  let value = target.randomRoll;
  if (value === undefined) {
    value = rng.randInt(100);
    target.randomRoll = value;
    rolls.push({ kind: "secondary_effect", targetIndex, limit: 100, value, sourceSymbol: "Battle::Battler#pbProcessMoveHit", sourceBodySha256: PROCESS_MOVE_HIT_BODY_SHA256 });
  }
  target.triggered = Number(value) < chance;
  return target;
}

function secondaryTargetWithResolvedDamage(targetInput, calculatedDamage) {
  const target = targetInput ?? {};
  if (target.calcDamage !== undefined) return target;
  return { ...target, calcDamage: Number(calculatedDamage ?? 0) };
}

function materializeAction(action, rng) {
  const prepared = structuredClone(action ?? {});
  if (!Array.isArray(prepared.secondaryEffectInputs)) return prepared;
  if (prepared.userHasSheerForce) {
    prepared.secondaryEffectInputs = prepared.secondaryEffectInputs.map((target) => ({ ...target, triggered: false }));
    return prepared;
  }
  const rolls = [];
  prepared.secondaryEffectInputs = prepared.secondaryEffectInputs.map((target, index) => materializeSecondaryTarget(
    secondaryTargetWithResolvedDamage(target, prepared.calculatedDamage),
    rng,
    rolls,
    index,
  ));
  if (rolls.length) prepared.seededSecondaryEffectRolls = rolls;
  return prepared;
}

export function materializeSeededSecondaryEffectsCanonical(input = {}) {
  const seed = Number(input.secondaryEffectRandomSeed ?? 0) & 0x7fffffff;
  const rng = new RubyMT19937Random(seed);
  const rounds = (Array.isArray(input.rounds) ? input.rounds : []).map((round) => ({
    ...round,
    actions: (Array.isArray(round.actions) ? round.actions : []).map((action) => materializeAction(action, rng)),
  }));
  return { ...input, rounds, secondaryEffectRandomSeed: seed };
}
