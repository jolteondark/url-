import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

function normalizeEvolution(entry) {
  if (Array.isArray(entry)) {
    const [species, method, parameter, prevolution = false] = entry;
    return {
      species: String(species ?? ""),
      method: String(method ?? ""),
      parameter,
      prevolution: prevolution === true,
    };
  }
  if (!entry || typeof entry !== "object") return null;
  return {
    species: String(entry.species ?? entry.target ?? entry.id ?? ""),
    method: String(entry.method ?? entry.type ?? ""),
    parameter: entry.parameter ?? entry.param ?? entry.level,
    prevolution: (entry.prevolution ?? entry.is_prevolution ?? entry.prevo) === true,
  };
}

function normalizeLevelMove(entry) {
  if (Array.isArray(entry)) {
    const [level, move] = entry;
    return { level: Number(level), move: String(move ?? "") };
  }
  if (!entry || typeof entry !== "object") return null;
  return { level: Number(entry.level), move: String(entry.move ?? entry.id ?? "") };
}

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function levelEvolutionTarget(speciesMaster, level) {
  const unsupportedMethods = new Set();
  let eligible = null;
  for (const raw of speciesMaster?.evolutions ?? []) {
    const evolution = normalizeEvolution(raw);
    if (!evolution?.species || !evolution.method || evolution.prevolution) continue;
    if (evolution.method !== "Level") {
      unsupportedMethods.add(evolution.method);
      continue;
    }
    const requiredLevel = Number(evolution.parameter);
    if (!Number.isInteger(requiredLevel) || requiredLevel < 1) continue;
    if (!eligible && level >= requiredLevel) {
      eligible = { target: evolution.species, method: evolution.method, parameter: requiredLevel };
    }
  }
  return {
    target: eligible?.target ?? null,
    method: eligible?.method ?? null,
    parameter: eligible?.parameter ?? null,
    unsupportedMethods: [...unsupportedMethods],
  };
}

function mergedUnsupportedMethods(...groups) {
  return [...new Set(groups.flatMap((group) => Array.isArray(group) ? group : []))];
}

function preserveAuthoritativeBattleFields(before, after) {
  const next = { ...after };
  for (const field of ["ability", "held_item"]) {
    if (before && Object.prototype.hasOwnProperty.call(before, field)) next[field] = before[field];
  }
  return next;
}

function preserveFaintedHp(before, after) {
  if (Number(before?.hp) === 0 && Number(after?.hp) !== 0) {
    return preserveAuthoritativeBattleFields(after, updatePokemonRuntime(after, { hp: 0 }));
  }
  return after;
}

function canonicalEvolutionBlocker(runtime) {
  const stepsToHatch = Number(runtime?.steps_to_hatch ?? 0);
  if (Number.isInteger(stepsToHatch) && stepsToHatch > 0) return "EGG";
  const heldItem = Object.prototype.hasOwnProperty.call(runtime ?? {}, "held_item")
    ? runtime.held_item
    : runtime?.item;
  const ability = Object.prototype.hasOwnProperty.call(runtime ?? {}, "ability")
    ? runtime.ability
    : runtime?.ability_id;
  if (String(heldItem ?? "").toUpperCase() === "EVERSTONE") return "EVERSTONE";
  if (String(ability ?? "").toUpperCase() === "BATTLEBOND") return "BATTLEBOND";
  return null;
}

function publicCandidate(candidate) {
  if (!candidate?.target) return null;
  return { to: candidate.target, method: candidate.method, parameter: candidate.parameter };
}

function evolutionMoveIds(speciesMaster, level) {
  const ids = [];
  for (const raw of speciesMaster?.level_moves ?? []) {
    const entry = normalizeLevelMove(raw);
    if (!entry?.move || !Number.isInteger(entry.level)) continue;
    if (entry.level !== 0 && entry.level !== Number(level)) continue;
    if (!ids.includes(entry.move)) ids.push(entry.move);
  }
  return ids;
}

function explicitMoveDecision(moveDecisions, level, move) {
  if (!moveDecisions || typeof moveDecisions !== "object") return null;
  return moveDecisions[`${level}:${move}`] ?? moveDecisions[`evolution:${move}`] ?? null;
}

function resolvedMoveDecision({
  moveDecisions,
  moveDecisionResolver,
  moveDecisionResolverSource,
  level,
  move,
  moves,
}) {
  const explicit = explicitMoveDecision(moveDecisions, level, move);
  if (explicit != null) return explicit;
  let resolver = moveDecisionResolver;
  if (!resolver && (moveDecisionResolverSource == null || moveDecisionResolverSource === "safari_browser") && typeof globalThis !== "undefined") {
    resolver = globalThis.__maplessSafariMoveLearningResolver;
  }
  if (typeof resolver !== "function") return null;
  return resolver({ level, move, moves: moves.map(moveId), reason: "evolution" }) ?? null;
}

function applyEvolutionMoveLearning(runtime, targetMaster, {
  move_masters,
  nature_master,
  disable_ivs_and_evs,
  maxMoves,
  moveDecisions,
  moveDecisionResolver,
  moveDecisionResolverSource,
}) {
  const moves = (runtime.moves ?? []).map((move) => structuredClone(move));
  const operations = [];
  const level = Number(runtime.level);
  let changed = false;

  for (const move of evolutionMoveIds(targetMaster, level)) {
    if (moves.some((known) => moveId(known) === move)) {
      operations.push({ op: "skip_known_move", level, move, reason: "evolution" });
      continue;
    }
    if (moves.length < maxMoves) {
      moves.push(move);
      changed = true;
      operations.push({ op: "learn_move", level, move, slot: moves.length - 1, reason: "evolution", resetPp: true });
      operations.push({ op: "check_form_on_moveset_change", move, reason: "evolution" });
      continue;
    }

    const decision = resolvedMoveDecision({
      moveDecisions,
      moveDecisionResolver,
      moveDecisionResolverSource,
      level,
      move,
      moves,
    });
    if (decision?.decline === true) {
      operations.push({ op: "decline_move", level, move, reason: "evolution" });
      continue;
    }
    const forgetIndex = Number(decision?.forgetIndex);
    if (!Number.isInteger(forgetIndex) || forgetIndex < 0 || forgetIndex >= moves.length) {
      operations.push({ op: "decline_move", level, move, reason: "evolution" });
      continue;
    }
    const forgotten = moveId(moves[forgetIndex]);
    moves[forgetIndex] = move;
    changed = true;
    operations.push({ op: "replace_move", level, move, slot: forgetIndex, forgotten, reason: "evolution", resetPp: true });
    operations.push({ op: "check_form_on_moveset_change", move, reason: "evolution" });
  }

  if (!changed) return { pokemon: runtime, operations };
  const rematerialized = preserveFaintedHp(runtime, preserveAuthoritativeBattleFields(runtime, resolvePokemonRuntimeMasters({ ...runtime, moves }, {
    species_master: targetMaster,
    nature_master,
    move_masters,
    disable_ivs_and_evs,
  })));
  return { pokemon: rematerialized, operations };
}

export function resolvePokemonLevelEvolution(runtime, {
  species_masters,
  nature_master = null,
  move_masters = {},
  disable_ivs_and_evs = false,
  maxMoves = 4,
  moveDecisions = {},
  moveDecisionResolver = null,
  moveDecisionResolverSource = null,
} = {}) {
  if (!species_masters || typeof species_masters !== "object" || Array.isArray(species_masters)) {
    throw new TypeError("species_masters must be an object keyed by species id");
  }
  const sourceMaster = species_masters[runtime?.species];
  if (!sourceMaster) throw new RangeError(`missing species master for ${runtime?.species ?? "unknown species"}`);
  const candidate = levelEvolutionTarget(sourceMaster, Number(runtime.level));
  const levelEvolutionCandidate = publicCandidate(candidate);
  if (!candidate.target) {
    return {
      pokemon: runtime,
      evolved: false,
      evolution: null,
      levelEvolutionCandidate: null,
      evolutionBlockedBy: null,
      unsupportedMethods: candidate.unsupportedMethods,
      operations: [],
    };
  }

  const blocker = canonicalEvolutionBlocker(runtime);
  if (blocker) {
    return {
      pokemon: runtime,
      evolved: false,
      evolution: null,
      levelEvolutionCandidate,
      evolutionBlockedBy: blocker,
      unsupportedMethods: candidate.unsupportedMethods,
      operations: [{ op: "level_evolution_blocked", blocker }],
    };
  }

  const targetMaster = species_masters[candidate.target];
  if (!targetMaster) throw new RangeError(`missing evolution target species master for ${candidate.target}`);
  const before = structuredClone(runtime);
  const nextForm = Number.isInteger(Number(targetMaster.form)) ? Number(targetMaster.form) : 0;
  const speciesChanged = updatePokemonRuntime(runtime, { species: candidate.target, form: nextForm });
  let recalculated = preserveFaintedHp(before, preserveAuthoritativeBattleFields(before, resolvePokemonRuntimeMasters(speciesChanged, {
    species_master: targetMaster,
    nature_master,
    move_masters,
    disable_ivs_and_evs,
  })));
  const learned = applyEvolutionMoveLearning(recalculated, targetMaster, {
    move_masters,
    nature_master,
    disable_ivs_and_evs,
    maxMoves: Math.max(1, Math.trunc(Number(maxMoves) || 4)),
    moveDecisions,
    moveDecisionResolver,
    moveDecisionResolverSource,
  });
  recalculated = learned.pokemon;
  const targetCandidate = levelEvolutionTarget(targetMaster, Number(recalculated.level));
  const unsupportedMethods = mergedUnsupportedMethods(candidate.unsupportedMethods, targetCandidate.unsupportedMethods);

  return {
    pokemon: recalculated,
    evolved: true,
    evolution: { from: before.species, to: candidate.target, method: candidate.method, parameter: candidate.parameter },
    levelEvolutionCandidate,
    evolutionBlockedBy: null,
    unsupportedMethods,
    operations: [{
      op: "level_evolution",
      from: before.species,
      to: candidate.target,
      method: candidate.method,
      parameter: candidate.parameter,
      oldMaxHp: before.max_hp ?? null,
      newMaxHp: recalculated.max_hp ?? null,
      oldHp: before.hp ?? null,
      newHp: recalculated.hp ?? null,
    }, ...learned.operations],
  };
}
