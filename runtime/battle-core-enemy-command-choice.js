import { RubyMT19937Random } from "./ruby-mt19937-random.js";

export const DEFAULT_CHOOSE_ENEMY_COMMAND_BODY_SHA256 = "7cee8d7c46ffc7d84be9a54219803089e68560dd076670387c21d98ed9b6a5f1";
export const CHOOSE_MOVE_BODY_SHA256 = "9369e94cca9861350905b15b4ab77bf5782799113b28506871b731852f0cb6f3";
export const MOVE_SCORE_THRESHOLD_BODY_SHA256 = "9a10569910f79c26818cea27c7e90c32dd514c783b883fda92f23e61921d2ea0";
export const HIGH_SKILL_BODY_SHA256 = "3292e9faa9173d760612a97370325767a58903c429627f14d78251e99b6192a5";

export function moveScoreThresholdCanonical(skill = 0) {
  return 0.6 + (0.35 * Math.sqrt(Math.min(Number(skill) || 0, 100) / 100));
}

function normalizedChoices(choices) {
  return (Array.isArray(choices) ? choices : []).map((choice) => ({
    moveIndex: Number(choice?.moveIndex ?? -1),
    score: Math.max(0, Math.trunc(Number(choice?.score ?? 0))),
    targetIndex: Number(choice?.targetIndex ?? -1),
  }));
}

function createAIRandom(input) {
  const explicit = Array.isArray(input.aiRandomRolls) ? [...input.aiRandomRolls] : [];
  const rng = input.aiRandomSeed === undefined
    ? null
    : new RubyMT19937Random(Number(input.aiRandomSeed) & 0x7fffffff);
  const consumed = [];
  return {
    consumed,
    next(limit, kind) {
      let value;
      if (explicit.length) value = Number(explicit.shift());
      else {
        if (!rng) throw new Error(`aiRandomSeed or aiRandomRolls is required for ${kind}`);
        value = rng.randInt(limit);
      }
      if (!Number.isInteger(value) || value < 0 || value >= limit) {
        throw new RangeError(`${kind} roll must be 0..${limit - 1}`);
      }
      consumed.push({ kind, limit, value });
      return value;
    },
  };
}

export function resolveEnemyMoveChoiceCanonical(input = {}) {
  const choices = normalizedChoices(input.choices);
  if (!choices.length) {
    return {
      command: "auto_choose_move",
      moveIndex: null,
      targetIndex: -1,
      reason: "no_choices",
      randomRolls: [],
    };
  }

  const skill = Number(input.skill ?? 0);
  const random = createAIRandom(input);
  const maxScore = Math.max(...choices.map((choice) => choice.score));
  const scoreThreshold = moveScoreThresholdCanonical(skill);
  let badMoves = false;

  if (skill >= 48 && input.canSwitchLax) {
    if (maxScore <= 60) {
      badMoves = true;
    } else if (maxScore < 100 * scoreThreshold && Number(input.turnCount ?? 0) > 2) {
      badMoves = random.next(100, "bad_move_switch_gate") < 80;
    }
    if (badMoves && input.badMoveSwitchRegistered) {
      return {
        command: "switch",
        partyIndex: Number(input.badMoveSwitchPartyIndex ?? -1),
        unregisterMegaEvolution: true,
        reason: "bad_moves_switch",
        randomRolls: random.consumed,
      };
    }
  }

  const threshold = Math.floor(maxScore * scoreThreshold);
  const weightedChoices = choices.map((choice) => ({
    ...choice,
    weight: Math.max(choice.score - threshold, 0),
  }));
  const totalScore = weightedChoices.reduce((sum, choice) => sum + choice.weight, 0);
  if (totalScore <= 0) {
    return {
      command: "none",
      moveIndex: null,
      targetIndex: -1,
      reason: "zero_total_score",
      threshold,
      weightedChoices,
      randomRolls: random.consumed,
    };
  }

  let roll = random.next(totalScore, "weighted_move_choice");
  const weightedRoll = roll;
  let selected = null;
  for (const choice of weightedChoices) {
    roll -= choice.weight;
    if (roll < 0) {
      selected = choice;
      break;
    }
  }
  return {
    command: "move",
    moveIndex: selected?.moveIndex ?? null,
    targetIndex: selected?.targetIndex ?? -1,
    reason: "weighted_move_choice",
    maxScore,
    threshold,
    totalScore,
    weightedRoll,
    weightedChoices,
    randomRolls: random.consumed,
  };
}

export function resolveEnemyCommandChoiceCanonical(input = {}) {
  if (input.switchRegistered) {
    return { command: "switch", partyIndex: Number(input.switchPartyIndex ?? -1), reason: "switch_first" };
  }
  if (input.itemRegistered) {
    return { command: "item", item: input.item ?? null, targetIndex: Number(input.itemTargetIndex ?? -1), reason: "item_second" };
  }
  if (input.autoFightRegistered) return { command: "auto_fight", reason: "auto_fight_third" };
  const move = resolveEnemyMoveChoiceCanonical(input.moveChoiceInput ?? input);
  return { ...move, megaEvolutionRegistered: Boolean(input.megaEvolutionRegistered), commandOrder: ["switch", "item", "auto_fight", "mega_evolution", "move"] };
}

export function buildWildMoveChoicesCanonical(availableChoices = []) {
  return (Array.isArray(availableChoices) ? availableChoices : []).map((choice) => ({
    moveIndex: Number(choice?.moveIndex ?? -1),
    score: 100,
    targetIndex: Number(choice?.targetIndex ?? -1),
  }));
}
