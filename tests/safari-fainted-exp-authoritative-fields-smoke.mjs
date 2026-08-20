import assert from "node:assert/strict";
import { commitBattleSystemsExpRuntime } from "../runtime/battle-exp-runtime-integration.js";
import { minimumExpForLevel } from "../runtime/pokemon-growth-rate.js";
import { resolvePokemonRuntimeMasters } from "../runtime/pokemon-runtime-masters.js";
import { normalBattleExpInput } from "../runtime/safari-normal-battle-finalize.js";
import { SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS } from "../runtime/safari-playable-data.js";

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const source = {
  id: "AUTHFAINT",
  name: "Authoritative Faint",
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 60,
  catch_rate: 255,
  base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
  level_moves: [],
  evolutions: [],
};
const foe = {
  id: "AUTHFAINTFOE",
  name: "Authoritative Faint Foe",
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 1020,
  catch_rate: 255,
  base_stats: { HP: 20, ATTACK: 20, DEFENSE: 20, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 20 },
  level_moves: [],
  evolutions: [],
};
Object.assign(SAFARI_SPECIES_MASTERS, { AUTHFAINT: source, AUTHFAINTFOE: foe });

const initial = resolvePokemonRuntimeMasters({
  species: "AUTHFAINT",
  level: 10,
  exp: minimumExpForLevel("Medium", 10),
  personal_id: 246813579,
  gender: 0,
  form: 0,
  hp: 0,
  status: "POISON",
  status_count: 2,
  item: "LEGACYITEM",
  ability_id: "LEGACYABILITY",
  ability_index: 1,
  nature_id: "HARDY",
  iv: zeroStats,
  ev: zeroStats,
  moves: [{ id: "TACKLE", pp: 3, ppup: 0 }],
}, {
  species_master: source,
  nature_master: { id: "HARDY", stat_changes: [] },
  move_masters: SAFARI_MOVE_MASTERS,
});
initial.hp = 0;
initial.ability = "AUTHORITATIVEABILITY";
initial.held_item = "AUTHORITATIVEITEM";

const expInput = {
  ...normalBattleExpInput(initial, { species: "AUTHFAINTFOE", level: 10 }, false),
  deferCommit: false,
};
const committed = commitBattleSystemsExpRuntime({
  pokemon: initial,
  battleInput: {
    rounds: [{ actions: [{
      postHitResolution: { operations: [{ op: "gain_exp_request" }] },
      battleExpInput: expInput,
    }] }],
  },
  turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
});

assert.ok(committed.pokemon.level > initial.level, "fixture must level up through Battle EXP");
assert.ok(committed.pokemon.max_hp > initial.max_hp, "fixture must increase max HP and exercise fainted-HP preservation");
assert.equal(committed.pokemon.hp, 0, "Battle EXP stat growth must not revive a fainted Pokemon");
assert.equal(committed.pokemon.ability, "AUTHORITATIVEABILITY", "fainted HP correction must preserve Runtime-authoritative ability");
assert.equal(committed.pokemon.held_item, "AUTHORITATIVEITEM", "fainted HP correction must preserve Runtime-authoritative held item");
assert.equal(committed.pokemon.personal_id, initial.personal_id, "Battle EXP growth must keep individual identity");
assert.equal(committed.pokemon.status, "POISON", "Battle EXP growth must keep major status");
assert.equal(committed.pokemon.status_count, 2, "Battle EXP growth must keep status counter");
assert.equal(committed.pokemon.moves[0].pp, 3, "Battle EXP growth must not refill existing PP");

console.log("Fainted Battle EXP preserves authoritative ability/held item continuity: PASS");
