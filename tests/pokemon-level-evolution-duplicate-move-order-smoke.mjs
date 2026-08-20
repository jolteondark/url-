import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const zeroMaxed = { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false };
const baseStats = { HP: 50, ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 };
const moveMasters = {
  A: { id: "A", total_pp: 20 }, B: { id: "B", total_pp: 20 }, C: { id: "C", total_pp: 20 }, D: { id: "D", total_pp: 20 },
  DUPMOVE: { id: "DUPMOVE", total_pp: 15 },
};
const speciesMasters = {
  SOURCE: { id:"SOURCE", form:0, growth_rate:"Medium", base_stats:baseStats, evolutions:[["TARGET","Level",20]], level_moves:[] },
  TARGET: {
    id:"TARGET", form:0, growth_rate:"Medium", base_stats:baseStats, evolutions:[],
    level_moves:[[0,"DUPMOVE"],[20,"DUPMOVE"]],
  },
};
const pokemon = {
  species:"SOURCE", form:0, level:20, exp:8000, hp:25, max_hp:40,
  stats:{ ATTACK:20, DEFENSE:20, SPECIAL_ATTACK:20, SPECIAL_DEFENSE:20, SPEED:20 },
  iv:zeroStats, iv_maxed:zeroMaxed, ev:zeroStats,
  moves:[{id:"A",pp:3,ppup:0},{id:"B",pp:4,ppup:0},{id:"C",pp:5,ppup:0},{id:"D",pp:6,ppup:0}],
  personal_id:12345, gender:0, nature_id:null, nature_for_stats_id:null, ability_index:null, ability_id:null,
  item:"KEPTITEM", held_item:"KEPTITEM", status:"NONE", status_count:0,
};

let resolverCalls = 0;
const result = resolvePokemonLevelEvolution(pokemon, {
  species_masters:speciesMasters,
  move_masters:moveMasters,
  moveDecisionResolver({ move }) {
    assert.equal(move, "DUPMOVE");
    resolverCalls += 1;
    return resolverCalls === 1 ? { decline:true } : { forgetIndex:1 };
  },
});

assert.equal(result.evolved, true);
assert.equal(result.pokemon.species, "TARGET");
assert.equal(resolverCalls, 2, "duplicate canonical evolution move entries must remain separate offers until learned");
assert.deepEqual(result.pokemon.moves.map((move) => move.id), ["A","DUPMOVE","C","D"]);
assert.equal(result.pokemon.moves[0].pp, 3);
assert.equal(result.pokemon.moves[2].pp, 5);
assert.equal(result.pokemon.moves[3].pp, 6);
assert.equal(result.pokemon.moves[1].pp, 15, "newly learned move must start at full PP");
assert.equal(result.pokemon.personal_id, pokemon.personal_id);
assert.equal(result.pokemon.held_item, "KEPTITEM");
assert.deepEqual(
  result.operations.filter((operation) => operation.move === "DUPMOVE").map((operation) => operation.op),
  ["decline_move","replace_move","check_form_on_moveset_change"],
);

console.log("pokemon-level-evolution duplicate move ordering smoke: PASS");
