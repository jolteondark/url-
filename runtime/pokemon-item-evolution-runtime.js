import { resolvePokemonLevelEvolution } from "./pokemon-level-evolution-runtime.js";

const ITEM_EVOLUTION_SENTINEL = -2147483648;

function normalizedDataId(value) {
  return String(value ?? "").replace(/^:/, "");
}

function normalizeEvolution(entry) {
  if (Array.isArray(entry)) {
    const [species, method, parameter, prevolution = false] = entry;
    return { species: String(species ?? ""), method: String(method ?? ""), parameter, prevolution: prevolution === true };
  }
  if (!entry || typeof entry !== "object") return null;
  return {
    species: String(entry.species ?? entry.target ?? entry.id ?? ""),
    method: String(entry.method ?? entry.type ?? ""),
    parameter: entry.parameter ?? entry.param ?? entry.item,
    prevolution: (entry.prevolution ?? entry.is_prevolution ?? entry.prevo) === true,
  };
}

function itemEvolutionCandidate(speciesMaster, item) {
  const itemId = normalizedDataId(item);
  if (!itemId) return null;
  for (const raw of speciesMaster?.evolutions ?? []) {
    const evolution = normalizeEvolution(raw);
    if (!evolution?.species || evolution.prevolution || evolution.method !== "Item") continue;
    if (normalizedDataId(evolution.parameter) !== itemId) continue;
    return { target: evolution.species, method: "Item", parameter: itemId };
  }
  return null;
}

function selectedSourceMaster(sourceMaster, candidate) {
  return {
    ...sourceMaster,
    evolutions: [[candidate.target, "Level", ITEM_EVOLUTION_SENTINEL, false]],
  };
}

/**
 * Resolve a bag-used evolution item/stone without mutating the bag itself.
 *
 * The caller owns bag mutation. `consumeRequested` is true only after a
 * successful evolution, so the bag layer can remove exactly one item after
 * success and keep it on failed/ineligible uses.
 */
export function resolvePokemonItemEvolution(runtime, item, {
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

  const candidate = itemEvolutionCandidate(sourceMaster, item);
  if (!candidate) {
    return {
      pokemon: runtime,
      evolved: false,
      evolution: null,
      itemEvolutionCandidate: null,
      evolutionBlockedBy: null,
      consumeRequested: false,
      consumedItem: null,
      operations: [],
    };
  }

  const selectedMasters = {
    ...species_masters,
    [runtime.species]: selectedSourceMaster(sourceMaster, candidate),
  };
  const resolved = resolvePokemonLevelEvolution(runtime, {
    species_masters: selectedMasters,
    nature_master,
    move_masters,
    disable_ivs_and_evs,
    maxMoves,
    moveDecisions,
    moveDecisionResolver,
    moveDecisionResolverSource,
  });

  if (!resolved.evolved) {
    return {
      ...resolved,
      itemEvolutionCandidate: { to: candidate.target, method: "Item", parameter: candidate.parameter },
      consumeRequested: false,
      consumedItem: null,
    };
  }

  return {
    ...resolved,
    evolution: { from: runtime.species, to: candidate.target, method: "Item", parameter: candidate.parameter },
    itemEvolutionCandidate: { to: candidate.target, method: "Item", parameter: candidate.parameter },
    consumeRequested: true,
    consumedItem: candidate.parameter,
    operations: resolved.operations.map((operation) => operation?.op === "level_evolution"
      ? { ...operation, op: "item_evolution", method: "Item", parameter: candidate.parameter }
      : operation),
  };
}
