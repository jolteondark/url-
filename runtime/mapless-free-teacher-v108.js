import { commitCanonicalMoveLearnV108 } from "./mapless-pokemon-move-learn-v108.js";

function moveId(move) {
  return String(typeof move === "string" ? move : move?.id ?? "");
}

function numericSeed(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new TypeError(`${label} must be an integer`);
  return n;
}

/**
 * Canonical v0.9.108 free-teacher resolver.
 *
 * Species/form metadata projection remains outside this owner. Callers provide the
 * source-backed candidate list; this owner owns the canonical candidate cleanup,
 * deterministic teacher selection, and delegation to the shared move-learn commit.
 */
export function resolveCanonicalFreeTeacherV108({
  pokemon,
  candidate_moves,
  teacher_seed,
  normal_seed = 0,
  replacement_index = null,
  cancelled = false,
}) {
  if (!pokemon || typeof pokemon !== "object") throw new TypeError("pokemon is required");
  const personalId = numericSeed(pokemon.personal_id ?? pokemon.personalID, "pokemon personal_id");
  const teacherSeed = numericSeed(teacher_seed ?? 0, "teacher_seed");
  const normalSeed = numericSeed(normal_seed ?? 0, "normal_seed");
  const effectiveSeed = teacherSeed === 0 ? normalSeed : teacherSeed;

  const known = new Set((pokemon.moves ?? []).map(moveId).filter(Boolean));
  const candidates = [...new Set((candidate_moves ?? []).map(moveId).filter(Boolean))]
    .filter((id) => !known.has(id))
    .sort();

  if (candidates.length === 0) {
    return {
      success:false,
      result:"no_eligible_moves",
      pokemon,
      candidateMoves:[],
      selectedMoveId:null,
    };
  }

  const selectedIndex = ((effectiveSeed ^ personalId) & 0x7fffffff) % candidates.length;
  const selectedMoveId = candidates[selectedIndex];
  const commit = commitCanonicalMoveLearnV108(pokemon, {
    op:"learn_move",
    move_id:selectedMoveId,
    replacement_index,
    cancelled,
  });

  return {
    ...commit,
    candidateMoves:candidates,
    selectedMoveId,
    selectedIndex,
    effectiveSeed,
  };
}
