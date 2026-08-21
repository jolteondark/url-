import { resolveExpLevelMoveFlow } from "./battle-exp-level-move-flow.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";
import { resolvePokemonLevelEvolutionWithPartyContext } from "./pokemon-level-evolution-party-context.js";
import { clearSafariBattleMoveLearningDecisions } from "./safari-battle-move-learning-choice.js";

function hasGainExpRequest(action) {
  return (action?.postHitResolution?.operations ?? []).some((entry) => entry.op === "gain_exp_request");
}

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function reflectedMoves(runtime, moveIds) {
  const existing = new Map((runtime?.moves ?? []).map((move) => [moveId(move), move]));
  return (moveIds ?? []).map((id) => existing.has(id) ? structuredClone(existing.get(id)) : id);
}

function preserveFaintedHp(before, after) {
  if (Number(before?.hp) === 0 && Number(after?.hp) !== 0) {
    return preserveAuthoritativeBattleFields(after, updatePokemonRuntime(after, { hp: 0 }));
  }
  return after;
}

function preserveAuthoritativeBattleFields(before, after) {
  const next = { ...after };
  for (const field of ["ability", "held_item"]) {
    if (before && Object.prototype.hasOwnProperty.call(before, field)) next[field] = before[field];
  }
  return next;
}

function applyCanonicalLevelUpHappiness(runtime, levelUpCount, battleExpInput = {}) {
  if (!Number.isInteger(levelUpCount) || levelUpCount <= 0 || battleExpInput.activeBattler === false) return runtime;
  const current = Number(runtime?.happiness);
  if (!Number.isInteger(current)) return runtime;

  const context = battleExpInput.happinessContext ?? {};
  const currentMapId = Number(context.currentMapId);
  const sameObtainMap = Number.isInteger(currentMapId) && Number(runtime?.obtain_map) === currentMapId;
  const luxuryBall = String(runtime?.poke_ball ?? "").toUpperCase() === "LUXURYBALL";
  const heldItem = Object.prototype.hasOwnProperty.call(runtime ?? {}, "held_item") ? runtime.held_item : runtime?.item;
  const sootheBell = String(heldItem ?? "").toUpperCase() === "SOOTHEBELL";
  const softCap = context.applyHappinessSoftCap === true;

  let happiness = Math.max(0, Math.min(255, current));
  for (let i = 0; i < levelUpCount; i += 1) {
    const happinessRange = Math.min(2, Math.floor(happiness / 100));
    let gain = [5, 4, 3][happinessRange];
    if (sameObtainMap) gain += 1;
    if (luxuryBall) gain += 1;
    if (sootheBell) gain = Math.floor(gain * 1.5);
    if (softCap) gain = happiness >= 179 ? 0 : Math.max(0, Math.min(gain, 179 - happiness));
    happiness = Math.max(0, Math.min(255, happiness + gain));
  }
  return preserveAuthoritativeBattleFields(runtime, updatePokemonRuntime(runtime, { happiness }));
}

function deferredDescriptor(roundIndex, actionIndex, battleExpInput) {
  const input = structuredClone(battleExpInput);
  input.deferCommit = false;
  return {
    roundIndex,
    actionIndex,
    deferred: true,
    expGained: 0,
    operations: [],
    battleExpInput: input,
  };
}

export function commitBattleSystemsExpRuntime({ battleInput = {}, turn = {}, pokemon } = {}) {
  let runtime = pokemon;
  const commits = [];
  const executed = new Set(
    (Array.isArray(turn?.operations) ? turn.operations : [])
      .filter((entry) => entry.op === "use_move")
      .map((entry) => `${Number(entry.round) - 1}:${Number(entry.action)}`),
  );

  for (const [roundIndex, round] of (Array.isArray(battleInput.rounds) ? battleInput.rounds : []).entries()) {
    for (const [actionIndex, action] of (Array.isArray(round.actions) ? round.actions : []).entries()) {
      if (!executed.has(`${roundIndex}:${actionIndex}`) || !hasGainExpRequest(action) || !action?.battleExpInput) continue;
      if (action.battleExpInput.deferCommit === true) {
        commits.push(deferredDescriptor(roundIndex, actionIndex, action.battleExpInput));
        continue;
      }
      if (runtime?.exp == null || runtime?.level == null) throw new TypeError("pokemon exp and level are required for battle EXP reflection");
      const before = runtime;
      const beforeLevel = Number(runtime.level);
      const flow = resolveExpLevelMoveFlow({
        ...structuredClone(action.battleExpInput),
        pokemon: { exp: Number(runtime.exp), level: Number(runtime.level), moves: (runtime.moves ?? []).map(moveId) },
      });
      const moves = reflectedMoves(runtime, flow.pokemon.moves);
      const runtimeMasters = action.battleExpInput.runtimeMasters ?? null;
      runtime = runtimeMasters
        ? preserveAuthoritativeBattleFields(before, resolvePokemonRuntimeMasters({ ...runtime, exp: Number(flow.pokemon.exp), level: Number(flow.pokemon.level), moves }, structuredClone(runtimeMasters)))
        : updatePokemonRuntime(runtime, {
          exp: Number(flow.pokemon.exp),
          level: Number(flow.pokemon.level),
          moves,
        });
      runtime = preserveFaintedHp(before, runtime);
      const levelUpCount = (flow.operations ?? []).filter((entry) => entry?.op === "change_happiness" && entry?.reason === "levelup").length;
      runtime = applyCanonicalLevelUpHappiness(runtime, levelUpCount, action.battleExpInput);

      let evolution = null;
      let evolutionDeferred = false;
      const evolutionMasters = action.battleExpInput.evolutionMasters ?? null;
      if (evolutionMasters && Number(flow.pokemon.level) > beforeLevel) {
        const beforeEvolution = runtime;
        const deferEvolution = action.battleExpInput.deferEvolution === true;
        evolution = resolvePokemonLevelEvolutionWithPartyContext(runtime, {
          ...evolutionMasters,
          maxMoves: action.battleExpInput.maxMoves ?? 4,
          // Deferred evolution is eligibility-only here. Do not consume explicit
          // choices or invoke the live browser resolver until terminal
          // REWARD_GROWTH actually executes the evolution. Party-context methods
          // can surface a deferred candidate without guessing their final result.
          moveDecisions: deferEvolution ? {} : (action.battleExpInput.moveDecisions ?? {}),
          moveDecisionResolver: deferEvolution ? null : (action.battleExpInput.moveDecisionResolver ?? null),
          moveDecisionResolverSource: deferEvolution ? "deferred_probe" : (action.battleExpInput.moveDecisionResolverSource ?? null),
        });
        const hasEligibleLevelEvolution = Boolean(evolution?.levelEvolutionCandidate);
        if (deferEvolution && hasEligibleLevelEvolution) {
          evolutionDeferred = true;
          runtime = { ...runtime, __battle_level_evolution_pending: true };
        } else if (hasEligibleLevelEvolution) {
          runtime = preserveAuthoritativeBattleFields(beforeEvolution, preserveFaintedHp(beforeEvolution, evolution.pokemon));
          evolution = { ...evolution, pokemon: runtime };
        }
      }
      clearSafariBattleMoveLearningDecisions(runtime);

      commits.push({
        roundIndex,
        actionIndex,
        result: flow.result,
        expGained: Number(flow.expGained),
        exp: Number(flow.pokemon.exp),
        level: Number(flow.pokemon.level),
        moves: structuredClone(runtime.moves),
        evolution: evolutionDeferred ? null : (evolution ? structuredClone(evolution.evolution) : null),
        pendingEvolution: evolutionDeferred ? structuredClone(evolution?.levelEvolutionCandidate ?? null) : null,
        evolutionDeferred,
        unsupportedEvolutionMethods: evolution ? [...evolution.unsupportedMethods] : [],
        operations: [
          ...structuredClone(flow.operations ?? []),
          ...(evolutionDeferred ? [] : structuredClone(evolution?.operations ?? [])),
        ],
      });
    }
  }
  return { pokemon: runtime, commits };
}

export function commitDeferredBattleSystemsExpRuntime({ deferredCommits = [], pokemon } = {}) {
  let runtime = pokemon;
  const commits = [];
  for (const deferred of deferredCommits ?? []) {
    if (deferred?.deferred !== true || !deferred?.battleExpInput) continue;
    const committed = commitBattleSystemsExpRuntime({
      pokemon: runtime,
      battleInput: {
        rounds: [{ actions: [{
          postHitResolution: { operations: [{ op: "gain_exp_request" }] },
          battleExpInput: { ...structuredClone(deferred.battleExpInput), deferCommit: false },
        }] }],
      },
      turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
    });
    runtime = committed.pokemon;
    for (const commit of committed.commits) {
      commits.push({
        ...commit,
        roundIndex: Number(deferred.roundIndex ?? commit.roundIndex ?? 0),
        actionIndex: Number(deferred.actionIndex ?? commit.actionIndex ?? 0),
      });
    }
  }
  return { pokemon: runtime, commits };
}
