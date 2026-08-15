import { reduceMovePp } from "./battle-status-pp-flow.js";
import { setPokemonRuntimeMovePp } from "./pokemon-runtime.js";
import { resolveUseMovePreflightCanonical } from "./battle-core-use-move-preflight.js";

function runtimeReflectionPp(result) {
  const operations = Array.isArray(result?.operations) ? result.operations : [];
  const reflection = operations.findLast((entry) => entry.op === "runtime_pp_reflection");
  return reflection == null ? null : Number(reflection.pp);
}

function annotateOperations(operations, reason) {
  return (Array.isArray(operations) ? operations : []).map((entry) => ({ ...entry, reason: entry.reason ?? reason }));
}

function reachesPpStage(action, input) {
  const useMoveInput = action.useMoveInput ?? {};
  if (Boolean(useMoveInput.usingMultiTurnAttack)) return false;
  if (Boolean(useMoveInput.specialUsage ?? action.specialUsage)) return false;
  if (useMoveInput.movePresent === false) return false;
  if (useMoveInput.tryUseMoveSuccess === false) return false;
  if (useMoveInput.afterTryMovePresent === false) return false;
  return input.skipPpStage !== true;
}

function resolveCoreEffectivePpInput(action, input) {
  const probe = structuredClone(action);
  probe.useMoveInput = { ...(probe.useMoveInput ?? {}), ppReduceSuccess: true };
  const preflight = resolveUseMovePreflightCanonical(probe);
  const effectiveMoveIndex = Number(preflight.moveIndex);
  const originalMoveIndex = Number(action.moveIndex ?? -1);
  if (!Number.isInteger(effectiveMoveIndex) || effectiveMoveIndex < 0 || effectiveMoveIndex === originalMoveIndex) {
    return input;
  }
  const choices = input.moveChoices;
  const choice = choices?.[effectiveMoveIndex] ?? choices?.[String(effectiveMoveIndex)];
  if (!choice || typeof choice !== "object" || typeof choice.move !== "object") {
    throw new TypeError(`battlePpInput.moveChoices[${effectiveMoveIndex}] is required for Core-resolved move redirect`);
  }
  return {
    ...input,
    ...choice,
    moveChoices: choices,
    resolvedBattleMoveIndex: effectiveMoveIndex,
    resolvedMoveId: preflight.moveId ?? choice.move.id ?? null,
  };
}

export function prepareBattleSystemsMovePp(action) {
  const resolved = structuredClone(action ?? {});
  let input = resolved.battlePpInput;
  if (resolved.kind !== "move" || !input) return { action: resolved, applied: false, operations: [] };
  if (!input.move || typeof input.move !== "object") throw new TypeError("battlePpInput.move is required");

  const useMoveInput = { ...(resolved.useMoveInput ?? {}) };
  resolved.useMoveInput = useMoveInput;
  const specialUsage = Boolean(useMoveInput.usingMultiTurnAttack) || Boolean(useMoveInput.specialUsage ?? resolved.specialUsage);
  const operations = [];

  if (!reachesPpStage(resolved, input)) {
    const move = structuredClone(input.move);
    resolved.battlePpResolution = {
      applied: true,
      commitEligible: false,
      specialUsage,
      success: true,
      runtimePp: null,
      pressureAttempts: 0,
      move,
      operations,
    };
    return { action: resolved, applied: true, operations };
  }

  input = resolveCoreEffectivePpInput(resolved, input);
  let move = structuredClone(input.move);
  const transformed = Boolean(input.transformed);
  const initial = reduceMovePp(move, { transformed });
  move = initial.move;
  operations.push(...annotateOperations(initial.operations, "move_use"));
  useMoveInput.ppReduceSuccess = Boolean(initial.success);

  let runtimePp = initial.success ? runtimeReflectionPp(initial) : null;
  let pressureAttempts = 0;
  if (initial.success) {
    const pressureReductions = Math.max(0, Number(useMoveInput.pressurePpReductions ?? 0));
    for (let index = 0; index < pressureReductions; index += 1) {
      const pressure = reduceMovePp(move, { transformed });
      move = pressure.move;
      operations.push(...annotateOperations(pressure.operations, "pressure"));
      const reflected = pressure.success ? runtimeReflectionPp(pressure) : null;
      if (reflected != null) runtimePp = reflected;
      pressureAttempts += 1;
    }
  }

  resolved.battlePpInput = { ...input, move };
  resolved.battlePpResolution = {
    applied: true,
    commitEligible: Boolean(initial.success),
    specialUsage: false,
    success: Boolean(initial.success),
    runtimePp,
    pressureAttempts,
    move,
    operations,
  };
  return { action: resolved, applied: true, operations };
}

export function prepareBattleSystemsPpRuntime({ battleInput = {} } = {}) {
  const prepared = structuredClone(battleInput ?? {});
  const operations = [];
  prepared.rounds = (Array.isArray(prepared.rounds) ? prepared.rounds : []).map((round, roundIndex) => ({
    ...round,
    actions: (Array.isArray(round.actions) ? round.actions : []).map((action, actionIndex) => {
      const result = prepareBattleSystemsMovePp(action);
      if (result.applied) operations.push({ roundIndex, actionIndex, operations: result.operations });
      return result.action;
    }),
  }));
  return { battleInput: prepared, operations };
}

export function commitBattleSystemsPpRuntime({ battleInput = {}, turn = {}, pokemon } = {}) {
  let runtime = pokemon;
  const commits = [];
  const executed = new Set(
    (Array.isArray(turn?.operations) ? turn.operations : [])
      .filter((entry) => entry.op === "use_move")
      .map((entry) => `${Number(entry.round) - 1}:${Number(entry.action)}`),
  );

  for (const [roundIndex, round] of (Array.isArray(battleInput.rounds) ? battleInput.rounds : []).entries()) {
    const actions = Array.isArray(round.actions) ? round.actions : [];
    for (const [actionIndex, action] of actions.entries()) {
      const resolution = action?.battlePpResolution;
      const input = action?.battlePpInput;
      if (!resolution?.commitEligible || !input || !executed.has(`${roundIndex}:${actionIndex}`)) continue;
      if (input.reflectToPokemon === false) continue;
      const pokemonMoveIndex = Number(input.pokemonMoveIndex ?? action.moveIndex);
      const baseTotalPp = Number(input.baseTotalPp);
      if (!Number.isInteger(pokemonMoveIndex) || pokemonMoveIndex < 0) throw new TypeError("battlePpInput.pokemonMoveIndex must be a non-negative integer");
      if (!Number.isInteger(baseTotalPp) || baseTotalPp < 0) throw new TypeError("battlePpInput.baseTotalPp must be a non-negative integer");
      runtime = setPokemonRuntimeMovePp(runtime, pokemonMoveIndex, Number(resolution.runtimePp), baseTotalPp);
      commits.push({ roundIndex, actionIndex, pokemonMoveIndex, pp: Number(resolution.runtimePp) });
    }
  }
  return { pokemon: runtime, commits };
}
