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

function materializeRandomChoiceCount(target, rng, rolls, targetIndex) {
  const specs = target.randomChoiceCountRanges;
  const selected = target.randomChoiceValue;
  const spec = specs && selected != null ? specs[String(selected)] : null;
  if (!spec) return;
  const base = Number(spec.base ?? 0);
  const range = Number(spec.range ?? 0);
  if (!Number.isInteger(base) || !Number.isInteger(range) || range <= 0) {
    throw new RangeError("secondary effect random choice count range must use integer base and positive range");
  }
  let roll = target.randomChoiceCountRoll;
  if (roll === undefined) {
    roll = rng.randInt(range);
    target.randomChoiceCountRoll = roll;
    rolls.push({ kind: "secondary_effect_choice_count", targetIndex, limit: range, value: roll, sourceSymbol: "Battle::Battler#pbSleepDuration" });
  }
  if (!Number.isInteger(Number(roll)) || Number(roll) < 0 || Number(roll) >= range) {
    throw new RangeError("secondary effect random choice count roll out of range");
  }
  target.randomChoiceCount = base + Number(roll);
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
  if (target.triggered && Array.isArray(target.randomChoiceValues) && target.randomChoiceValues.length > 0) {
    let choiceIndex = target.randomChoiceIndex;
    if (choiceIndex === undefined) {
      choiceIndex = rng.randInt(target.randomChoiceValues.length);
      target.randomChoiceIndex = choiceIndex;
      rolls.push({ kind: "secondary_effect_choice", targetIndex, limit: target.randomChoiceValues.length, value: choiceIndex, sourceSymbol: "Battle::Move random additional-effect choice" });
    }
    if (!Number.isInteger(Number(choiceIndex)) || Number(choiceIndex) < 0 || Number(choiceIndex) >= target.randomChoiceValues.length) {
      throw new RangeError("secondary effect random choice index out of range");
    }
    target.randomChoiceValue = target.randomChoiceValues[Number(choiceIndex)];
    materializeRandomChoiceCount(target, rng, rolls, targetIndex);
  }
  return target;
}

function secondaryTargetWithResolvedDamage(targetInput, calculatedDamage) {
  const target = targetInput ?? {};
  if (target.calcDamage !== undefined) return target;
  return { ...target, calcDamage: Number(calculatedDamage ?? 0) };
}

function secondaryTargetWithActionFacts(targetInput, action = {}) {
  const target = { ...(targetInput ?? {}) };
  for (const key of ["mechanicsGeneration", "userHasSereneGrace", "targetHasShieldDust", "moldBreaker"]) {
    if (target[key] === undefined && action[key] !== undefined) target[key] = action[key];
  }
  return target;
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
    secondaryTargetWithResolvedDamage(secondaryTargetWithActionFacts(target, prepared), prepared.calculatedDamage),
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
