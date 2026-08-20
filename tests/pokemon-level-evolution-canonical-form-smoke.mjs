import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const zeroMaxed = { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false };
const baseStats = { HP: 50, ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 };

function runtime(species, form) {
  return {
    species,
    form,
    forced_form: 7,
    level: 20,
    exp: 8000,
    hp: 25,
    max_hp: 40,
    stats: { ATTACK: 20, DEFENSE: 20, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 20 },
    iv: zeroStats,
    iv_maxed: zeroMaxed,
    ev: zeroStats,
    moves: [{ id: "TACKLE", pp: 12, ppup: 0 }],
    personal_id: 12345,
    gender: 0,
    nature_id: null,
    nature_for_stats_id: null,
    ability_id: "OLDABILITY",
    ability_index: 0,
    ability: "OLDABILITY",
    item: "KEPTITEM",
    held_item: "KEPTITEM",
    status: "POISON",
    status_count: 2,
  };
}

const moveMasters = { TACKLE: { id: "TACKLE", total_pp: 35 } };

function evolve({ sourceId, sourceForm, targetId, targetMaster }) {
  const speciesMasters = {
    [sourceId]: {
      id: sourceId,
      form: sourceForm,
      growth_rate: "Medium",
      base_stats: baseStats,
      abilities: ["OLDABILITY"],
      evolutions: [[targetId, "Level", 20]],
      level_moves: [[1, "TACKLE"]],
    },
    [targetId]: {
      id: targetId,
      growth_rate: "Medium",
      base_stats: baseStats,
      abilities: ["NEWABILITY"],
      evolutions: [],
      level_moves: [],
      ...targetMaster,
    },
  };
  return resolvePokemonLevelEvolution(runtime(sourceId, sourceForm), {
    species_masters: speciesMasters,
    move_masters: moveMasters,
  }).pokemon;
}

const defaultFormTarget = evolve({
  sourceId: "SOURCE_DEFAULT",
  sourceForm: 1,
  targetId: "TARGET_DEFAULT",
  targetMaster: { form: 0, default_form: 2 },
});
assert.equal(defaultFormTarget.form, 2, "canonical species change must prefer a non-negative default_form");
assert.equal(defaultFormTarget.forced_form, null, "species change must clear forced_form");

const explicitFormTarget = evolve({
  sourceId: "SOURCE_EXPLICIT",
  sourceForm: 1,
  targetId: "TARGET_EXPLICIT",
  targetMaster: { form: 3, default_form: -1 },
});
assert.equal(explicitFormTarget.form, 3, "canonical species change must use the target form when it is explicitly non-zero");

const inheritedFormTarget = evolve({
  sourceId: "SOURCE_INHERIT",
  sourceForm: 4,
  targetId: "TARGET_INHERIT",
  targetMaster: { form: 0, default_form: -1 },
});
assert.equal(inheritedFormTarget.form, 4, "canonical species change must preserve the current form when no default or explicit target form applies");
assert.equal(inheritedFormTarget.personal_id, 12345);
assert.equal(inheritedFormTarget.held_item, "KEPTITEM");
assert.equal(inheritedFormTarget.status, "POISON");
assert.equal(inheritedFormTarget.moves[0].pp, 12, "form selection must not restore existing PP");

console.log("pokemon-level-evolution canonical form smoke: PASS");
