import assert from "node:assert/strict";
import { resolveCanonicalFreeTeacherV108 } from "../runtime/mapless-free-teacher-v108.js";

const pokemon = {
  species:"PIKACHU",
  level:20,
  personal_id:7,
  moves:["TACKLE", "GROWL", "THUNDERWAVE"],
};

const resolved = resolveCanonicalFreeTeacherV108({
  pokemon,
  candidate_moves:["VOLTTACKLE", "CHARM", "TACKLE", "CHARM"],
  teacher_seed:10,
});
assert.deepEqual(resolved.candidateMoves, ["CHARM", "VOLTTACKLE"]);
assert.equal(resolved.selectedIndex, ((10 ^ 7) & 0x7fffffff) % 2);
assert.equal(resolved.selectedMoveId, "VOLTTACKLE");
assert.equal(resolved.success, true);
assert.deepEqual(resolved.pokemon.moves, ["TACKLE", "GROWL", "THUNDERWAVE", "VOLTTACKLE"]);
assert.deepEqual(pokemon.moves, ["TACKLE", "GROWL", "THUNDERWAVE"]);

const fallback = resolveCanonicalFreeTeacherV108({
  pokemon,
  candidate_moves:["VOLTTACKLE", "CHARM"],
  teacher_seed:0,
  normal_seed:8,
});
assert.equal(fallback.effectiveSeed, 8);
assert.equal(fallback.selectedIndex, ((8 ^ 7) & 0x7fffffff) % 2);

const none = resolveCanonicalFreeTeacherV108({
  pokemon,
  candidate_moves:["TACKLE", null, ""],
  teacher_seed:1,
});
assert.equal(none.success, false);
assert.equal(none.result, "no_eligible_moves");
assert.deepEqual(none.pokemon, pokemon);

const full = { ...pokemon, moves:["TACKLE", "GROWL", "THUNDERWAVE", "QUICKATTACK"] };
const needsReplacement = resolveCanonicalFreeTeacherV108({
  pokemon:full,
  candidate_moves:["VOLTTACKLE"],
  teacher_seed:3,
});
assert.equal(needsReplacement.result, "move_replacement_required");
assert.deepEqual(needsReplacement.pokemon.moves, full.moves);

const cancelled = resolveCanonicalFreeTeacherV108({
  pokemon:full,
  candidate_moves:["VOLTTACKLE"],
  teacher_seed:3,
  cancelled:true,
});
assert.equal(cancelled.result, "move_learn_cancelled");
assert.deepEqual(cancelled.pokemon.moves, full.moves);

const replaced = resolveCanonicalFreeTeacherV108({
  pokemon:full,
  candidate_moves:["VOLTTACKLE"],
  teacher_seed:3,
  replacement_index:1,
});
assert.equal(replaced.success, true);
assert.deepEqual(replaced.pokemon.moves, ["TACKLE", "VOLTTACKLE", "THUNDERWAVE", "QUICKATTACK"]);

console.log("free teacher owner smoke: ok");
