import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";
import { levelFromExp } from "./pokemon-growth-rate.js";

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

function levelEvolutionTarget(speciesMaster, runtime) {
  const unsupportedMethods = new Set();
  const level = Number(runtime?.level);
  const gender = Number(runtime?.gender);
  const happiness = Number(runtime?.happiness);
  const attack = Number(runtime?.stats?.ATTACK ?? runtime?.attack);
  const defense = Number(runtime?.stats?.DEFENSE ?? runtime?.defense);
  const personalId = Number(runtime?.personal_id);
  const personalityBucket = Number.isInteger(personalId)
    ? (((personalId >>> 0) >>> 16) & 0xFFFF) % 10
    : Number.NaN;
  const supportedMethods = new Set([
    "Level",
    "LevelMale",
    "LevelFemale",
    "AttackGreater",
    "AtkDefEqual",
    "DefenseGreater",
    "Silcoon",
    "Cascoon",
    "Ninjask",
    "Happiness",
    "HappinessMale",
    "HappinessFemale",
    "HappinessMove",
    "MaxHappiness",
  ]);
  let eligible = null;
  for (const raw of speciesMaster?.evolutions ?? []) {
    const evolution = normalizeEvolution(raw);
    if (!evolution?.species || !evolution.method || evolution.prevolution) continue;
    if (!supportedMethods.has(evolution.method)) {
      unsupportedMethods.add(evolution.method);
      continue;
    }

    if (evolution.method === "HappinessMove") {
      const requiredMove = String(evolution.parameter ?? "");
      const knowsMove = requiredMove.length > 0
        && (runtime?.moves ?? []).some((move) => String(moveId(move) ?? "") === requiredMove);
      const conditionMatches = Number.isInteger(happiness) && happiness >= 220 && knowsMove;
      if (!eligible && conditionMatches) {
        eligible = { target: evolution.species, method: evolution.method, parameter: requiredMove };
      }
      continue;
    }

    if (["Happiness", "HappinessMale", "HappinessFemale", "MaxHappiness"].includes(evolution.method)) {
      let conditionMatches = Number.isInteger(happiness);
      if (evolution.method === "MaxHappiness") conditionMatches = conditionMatches && happiness === 255;
      else conditionMatches = conditionMatches && happiness >= 220;
      if (evolution.method === "HappinessMale") conditionMatches = conditionMatches && gender === 0;
      else if (evolution.method === "HappinessFemale") conditionMatches = conditionMatches && gender === 1;
      if (!eligible && conditionMatches) {
        eligible = { target: evolution.species, method: evolution.method, parameter: null };
      }
      continue;
    }

    const requiredLevel = Number(evolution.parameter);
    if (!Number.isInteger(requiredLevel) || requiredLevel < 1) continue;
    let conditionMatches = evolution.method === "Level" || evolution.method === "Ninjask";
    if (evolution.method === "LevelMale") conditionMatches = gender === 0;
    else if (evolution.method === "LevelFemale") conditionMatches = gender === 1;
    else if (evolution.method === "AttackGreater") conditionMatches = Number.isFinite(attack) && Number.isFinite(defense) && attack > defense;
    else if (evolution.method === "AtkDefEqual") conditionMatches = Number.isFinite(attack) && Number.isFinite(defense) && attack === defense;
    else if (evolution.method === "DefenseGreater") conditionMatches = Number.isFinite(attack) && Number.isFinite(defense) && attack < defense;
    else if (evolution.method === "Silcoon") conditionMatches = Number.isFinite(personalityBucket) && personalityBucket < 5;
    else if (evolution.method === "Cascoon") conditionMatches = Number.isFinite(personalityBucket) && personalityBucket >= 5;
    if (!eligible && conditionMatches && level >= requiredLevel) {
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

function hasAbilityMasterData(speciesMaster) {
  return Array.isArray(speciesMaster?.abilities) || Array.isArray(speciesMaster?.hidden_abilities);
}

function canonicalEvolutionAbility(runtime, speciesMaster) {
  if (!hasAbilityMasterData(speciesMaster)) return undefined;
  const natural = Array.isArray(speciesMaster?.abilities) ? speciesMaster.abilities : [];
  const hidden = Array.isArray(speciesMaster?.hidden_abilities) ? speciesMaster.hidden_abilities : [];
  let index = Number(runtime?.ability_index);
  if (!Number.isInteger(index) || index < 0) {
    const personalId = Number(runtime?.personal_id);
    index = Number.isInteger(personalId) ? (personalId & 1) : 0;
  }
  let ability = null;
  if (index >= 2) {
    ability = hidden[index - 2] ?? null;
    if (!ability) {
      const personalId = Number(runtime?.personal_id);
      index = Number.isInteger(personalId) ? (personalId & 1) : 0;
    }
  }
  if (!ability) ability = natural[index] ?? natural[0] ?? null;
  return ability == null ? null : String(ability);
}

function applyCanonicalEvolutionAbility(runtime, speciesMaster) {
  const ability = canonicalEvolutionAbility(runtime, speciesMaster);
  if (ability === undefined) return runtime;
  let abilityIndex = Number(runtime?.ability_index);
  if (!Number.isInteger(abilityIndex) || abilityIndex < 0) {
    const personalId = Number(runtime?.personal_id);
    abilityIndex = Number.isInteger(personalId) ? (personalId & 1) : 0;
  }
  return { ...runtime, ability, ability_id: ability, ability_index: abilityIndex };
}

function applyCanonicalEvolutionGender(runtime, speciesMaster) {
  const ratio = String(speciesMaster?.gender_ratio ?? speciesMaster?.gender_ratio_id ?? "")
    .replace(/^:/, "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  if (ratio === "ALWAYSMALE") return { ...runtime, gender: 0 };
  if (ratio === "ALWAYSFEMALE") return { ...runtime, gender: 1 };
  if (ratio === "GENDERLESS") return { ...runtime, gender: 2 };
  return runtime;
}

function canonicalEvolutionForm(runtime, speciesMaster) {
  const defaultForm = Number(speciesMaster?.default_form ?? speciesMaster?.defaultForm);
  if (Number.isInteger(defaultForm) && defaultForm >= 0) return defaultForm;
  const targetForm = Number(speciesMaster?.form);
  if (Number.isInteger(targetForm) && targetForm > 0) return targetForm;
  const currentForm = Number(runtime?.form);
  return Number.isInteger(currentForm) && currentForm >= 0 ? currentForm : 0;
}

function canonicalEvolutionLevel(runtime, speciesMaster) {
  const growthRate = speciesMaster?.growth_rate ?? speciesMaster?.growthRate;
  const exp = Number(runtime?.exp);
  if (!growthRate || !Number.isInteger(exp) || exp < 0) return Number(runtime?.level);
  return levelFromExp(growthRate, exp);
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
    // Essentials collects every matching move-list entry in source order, then
    // pbLearnMove decides whether each offer is already known. Do not dedupe
    // here: if the player declines an earlier duplicate, a later duplicate is
    // still a distinct canonical offer.
    ids.push(entry.move);
  }
  return ids;
}

function explicitMoveDecision(moveDecisions, level, move, occurrence) {
  if (!moveDecisions || typeof moveDecisions !== "object") return null;
  // Duplicate level-0/current-level entries are separate canonical offers. Let
  // precomputed decisions address each offer independently while retaining the
  // legacy per-move keys for callers that do not need occurrence specificity.
  return moveDecisions[`${level}:${move}:${occurrence}`]
    ?? moveDecisions[`evolution:${move}:${occurrence}`]
    ?? moveDecisions[`${level}:${move}`]
    ?? moveDecisions[`evolution:${move}`]
    ?? null;
}

function resolvedMoveDecision({
  moveDecisions,
  moveDecisionResolver,
  moveDecisionResolverSource,
  level,
  move,
  occurrence,
  moves,
}) {
  const explicit = explicitMoveDecision(moveDecisions, level, move, occurrence);
  if (explicit != null) return explicit;
  let resolver = moveDecisionResolver;
  if (!resolver && (moveDecisionResolverSource == null || moveDecisionResolverSource === "safari_browser") && typeof globalThis !== "undefined") {
    resolver = globalThis.__maplessSafariMoveLearningResolver;
  }
  if (typeof resolver !== "function") return null;
  return resolver({ level, move, occurrence, moves: moves.map(moveId), reason: "evolution" }) ?? null;
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
  const offerCounts = new Map();
  let changed = false;

  for (const move of evolutionMoveIds(targetMaster, level)) {
    const occurrence = (offerCounts.get(move) ?? 0) + 1;
    offerCounts.set(move, occurrence);
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
      occurrence,
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
  const rematerialized = preserveAuthoritativeBattleFields(runtime, resolvePokemonRuntimeMasters({ ...runtime, moves }, {
    species_master: targetMaster,
    nature_master,
    move_masters,
    disable_ivs_and_evs,
  }));
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
  const candidate = levelEvolutionTarget(sourceMaster, runtime);
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
  const nextForm = canonicalEvolutionForm(runtime, targetMaster);
  const nextLevel = canonicalEvolutionLevel(runtime, targetMaster);
  const speciesChanged = updatePokemonRuntime(runtime, { species: candidate.target, form: nextForm, forced_form: null, level: nextLevel, ready_to_evolve: false });
  let recalculated = preserveAuthoritativeBattleFields(before, resolvePokemonRuntimeMasters(speciesChanged, {
    species_master: targetMaster,
    nature_master,
    move_masters,
    disable_ivs_and_evs,
  }));
  if (Number(before.hp) === 0) {
    // EvolutionScene#pbEvolutionSuccess mirrors Pokemon#species=, then explicitly
    // writes hp=0 for a previously fainted Pokemon before running calc_stats a
    // second time. The hp= setter also heals status. With unchanged max HP on
    // that second calculation, Essentials clamps the final HP to 1.
    const faintReset = preserveAuthoritativeBattleFields(before, updatePokemonRuntime(recalculated, {
      hp: 0,
      status: null,
      status_count: 0,
      ready_to_evolve: false,
    }));
    recalculated = preserveAuthoritativeBattleFields(before, resolvePokemonRuntimeMasters(faintReset, {
      species_master: targetMaster,
      nature_master,
      move_masters,
      disable_ivs_and_evs,
    }));
  }
  recalculated = applyCanonicalEvolutionAbility(recalculated, targetMaster);
  recalculated = applyCanonicalEvolutionGender(recalculated, targetMaster);
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
  const targetCandidate = levelEvolutionTarget(targetMaster, recalculated);
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
