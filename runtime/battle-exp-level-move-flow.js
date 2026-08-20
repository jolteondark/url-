import { calculateMaplessBattleExp } from "./mapless-experience-rules.js";
import { levelFromExp, maximumExpForGrowthRate } from "./pokemon-growth-rate.js";

function asInt(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new TypeError(`${field} must be an integer`);
  return n;
}

function rubyMulDivFloor(value, numerator, denominator) {
  return Math.floor((value * numerator) / denominator);
}

export function calculateExpBeforeGrowthClamp(input) {
  if (input.maplessExperienceRules) return calculateMaplessBattleExp(input);

  const defeatedLevel = asInt(input.defeatedLevel, "defeatedLevel");
  const baseExp = asInt(input.baseExp, "baseExp");
  const numParticipants = asInt(input.numParticipants ?? 0, "numParticipants");
  const expShareCount = asInt(input.expShareCount ?? 0, "expShareCount");
  const gainerLevel = asInt(input.gainerLevel, "gainerLevel");
  const participant = Boolean(input.participant);
  const hasExpShare = Boolean(input.hasExpShare);
  const expAll = Boolean(input.expAll);

  let exp = 0;
  const a = defeatedLevel * baseExp;
  if (expShareCount > 0 && (participant || hasExpShare)) {
    if (numParticipants === 0) {
      exp = Math.floor(a / (input.splitExpBetweenGainers ? expShareCount : 1));
    } else if (input.splitExpBetweenGainers) {
      if (participant) exp = Math.floor(a / (2 * numParticipants));
      if (hasExpShare) exp += Math.floor(a / (2 * expShareCount));
    } else {
      exp = participant ? a : Math.floor(a / 2);
    }
  } else if (participant) {
    exp = Math.floor(a / (input.splitExpBetweenGainers ? numParticipants : 1));
  } else if (expAll) {
    exp = Math.floor(a / 2);
  }
  if (exp <= 0) return 0;

  if (input.moreExpFromTrainerPokemon && input.trainerBattle) {
    exp = rubyMulDivFloor(exp, 3, 2);
  }
  if (input.scaledExpFormula) {
    exp = Math.floor(exp / 5);
    let levelAdjust = ((2 * defeatedLevel) + 10.0) / (gainerLevel + defeatedLevel + 10.0);
    levelAdjust = Math.sqrt(levelAdjust ** 5);
    exp = Math.floor(exp * levelAdjust);
    if (participant || hasExpShare) exp += 1;
  } else {
    exp = Math.floor(exp / 7);
  }

  const outsiderMultiplier = Number(input.outsiderMultiplier ?? 1);
  if (![1, 1.5, 1.7].includes(outsiderMultiplier)) {
    throw new RangeError("outsiderMultiplier must be 1, 1.5 or 1.7");
  }
  if (outsiderMultiplier !== 1) exp = Math.floor(exp * outsiderMultiplier);
  if (input.expCharm) exp = rubyMulDivFloor(exp, 3, 2);
  if (input.itemModifiedExp != null) {
    const modified = asInt(input.itemModifiedExp, "itemModifiedExp");
    if (modified >= 0) exp = modified;
  }
  if (input.affectionBoost) exp = rubyMulDivFloor(exp, 6, 5);
  return exp;
}

function levelFromThresholds(exp, thresholds, currentLevel) {
  let level = asInt(currentLevel, "currentLevel");
  const pairs = Object.entries(thresholds ?? {})
    .map(([k, v]) => [asInt(k, "threshold level"), asInt(v, "threshold exp")])
    .sort((a, b) => a[0] - b[0]);
  for (const [candidate, minimum] of pairs) {
    if (candidate > level && exp >= minimum) level = candidate;
  }
  return level;
}

function resolvedDecision({ decision, resolver, level, move, moves, occurrence }) {
  if (decision != null || typeof resolver !== "function") return decision;
  const resolved = resolver(Object.freeze({ level, move, occurrence, moves: Object.freeze([...moves]) }));
  if (resolved == null) return null;
  if (resolved.decline === true) return { decline: true };
  const forgetIndex = Number(resolved.forgetIndex);
  if (!Number.isInteger(forgetIndex) || forgetIndex < 0 || forgetIndex >= moves.length) return null;
  return { forgetIndex };
}

function learnMove(moves, newMove, decision, maxMoves, operations, level, resolver, occurrence) {
  if (moves.includes(newMove)) {
    operations.push({ op: "skip_known_move", move: newMove });
    return;
  }
  if (moves.length < maxMoves) {
    moves.push(newMove);
    operations.push({ op: "learn_move", move: newMove, slot: moves.length - 1 });
    operations.push({ op: "check_form_on_moveset_change" });
    return;
  }
  const chosen = resolvedDecision({ decision, resolver, level, move: newMove, moves, occurrence });
  if (chosen && Number.isInteger(chosen.forgetIndex) && chosen.forgetIndex >= 0 && chosen.forgetIndex < moves.length) {
    const forgotten = moves[chosen.forgetIndex];
    moves[chosen.forgetIndex] = newMove;
    operations.push({ op: "replace_move", slot: chosen.forgetIndex, forgotten, move: newMove, resetPp: true });
    operations.push({ op: "check_form_on_moveset_change" });
    return;
  }
  operations.push({ op: "decline_move", move: newMove });
}

function moveDecisionResolverFor(input) {
  if (typeof input?.moveDecisionResolver === "function") return input.moveDecisionResolver;
  if (input?.moveDecisionResolverSource === "safari_browser") {
    const resolver = globalThis.__maplessSafariMoveLearningResolver;
    if (typeof resolver === "function") return resolver;
  }
  return null;
}

export function resolveExpLevelMoveFlow(input) {
  const pokemon = {
    exp: asInt(input.pokemon.exp, "pokemon.exp"),
    level: asInt(input.pokemon.level, "pokemon.level"),
    moves: [...(input.pokemon.moves ?? [])],
  };
  const operations = [];
  const growthRate = input.growthRate == null ? null : String(input.growthRate);
  const maxExp = growthRate ? maximumExpForGrowthRate(growthRate) : asInt(input.maximumExp, "maximumExp");
  const maxMoves = asInt(input.maxMoves ?? 4, "maxMoves");

  if (pokemon.exp >= maxExp) {
    operations.push({ op: "recalculate_stats" });
    operations.push({ op: "runtime_reflection", exp: pokemon.exp, level: pokemon.level, moves: [...pokemon.moves] });
    return { result: "max_exp", expGained: 0, pokemon, operations };
  }

  const exp = calculateExpBeforeGrowthClamp({ ...input.expContext, gainerLevel: pokemon.level });
  const expFinal = Math.min(maxExp, pokemon.exp + exp);
  const expGained = expFinal - pokemon.exp;
  if (expGained <= 0) {
    operations.push({ op: "runtime_reflection", exp: pokemon.exp, level: pokemon.level, moves: [...pokemon.moves] });
    return { result: "no_exp", expGained: 0, pokemon, operations };
  }

  operations.push({ op: "gain_exp", amount: expGained });
  if (input.shadowPokemon) {
    if (asInt(input.heartStage ?? 0, "heartStage") <= 3) {
      pokemon.exp = expFinal;
      operations.push({ op: "shadow_exp_reflection", exp: pokemon.exp });
    }
    operations.push({ op: "runtime_reflection", exp: pokemon.exp, level: pokemon.level, moves: [...pokemon.moves] });
    return { result: "shadow", expGained, pokemon, operations };
  }

  const newLevel = growthRate
    ? levelFromExp(growthRate, expFinal)
    : levelFromThresholds(expFinal, input.levelThresholds, pokemon.level);
  if (newLevel < pokemon.level) throw new Error("new level cannot be below current level");
  pokemon.exp = expFinal;
  const movesByLevel = input.movesByLevel ?? {};
  const decisions = input.moveDecisions ?? {};
  const resolver = moveDecisionResolverFor(input);

  for (let level = pokemon.level + 1; level <= newLevel; level += 1) {
    operations.push({ op: "exp_bar_to_level", level });
    operations.push({ op: "level_up", level });
    operations.push({ op: "change_happiness", reason: "levelup" });
    operations.push({ op: "recalculate_stats" });
    const moveOccurrences = new Map();
    for (const move of movesByLevel[level] ?? []) {
      const occurrence = (moveOccurrences.get(move) ?? 0) + 1;
      moveOccurrences.set(move, occurrence);
      const occurrenceKey = `${level}:${move}:${occurrence}`;
      const legacyKey = `${level}:${move}`;
      const decision = Object.prototype.hasOwnProperty.call(decisions, occurrenceKey)
        ? decisions[occurrenceKey]
        : decisions[legacyKey];
      learnMove(pokemon.moves, move, decision, maxMoves, operations, level, resolver, occurrence);
    }
  }
  pokemon.level = newLevel;
  operations.push({ op: "exp_bar_final", exp: expFinal });
  operations.push({ op: "recalculate_stats" });
  operations.push({ op: "runtime_reflection", exp: pokemon.exp, level: pokemon.level, moves: [...pokemon.moves] });
  return { result: "awarded", expGained, pokemon, operations };
}
