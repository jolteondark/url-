import assert from "node:assert/strict";
import { commitBattleSystemsExpRuntime } from "../runtime/battle-exp-runtime-integration.js";
import { minimumExpForLevel } from "../runtime/pokemon-growth-rate.js";
import { resolvePokemonRuntimeMasters } from "../runtime/pokemon-runtime-masters.js";
import { saveRunState, loadRunState } from "../runtime/run-persistence.js";
import { setSafariBattleMoveLearningDecision } from "../runtime/safari-battle-move-learning-choice.js";
import { normalBattleExpInput } from "../runtime/safari-normal-battle-finalize.js";
import { SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS } from "../runtime/safari-playable-data.js";

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const source = {
  id: "REALRUNTEST",
  name: "Real Run Test",
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 60,
  catch_rate: 255,
  base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
  level_moves: [{ level: 11, move: "NEWONE" }, { level: 12, move: "NEWTWO" }],
  evolutions: [{ species: "REALRUNTEST2", method: "Level", parameter: 12 }],
};
const evolved = {
  id: "REALRUNTEST2",
  name: "Real Run Test 2",
  form: 1,
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 120,
  catch_rate: 255,
  base_stats: { HP: 70, ATTACK: 65, DEFENSE: 60, SPECIAL_ATTACK: 55, SPECIAL_DEFENSE: 60, SPEED: 50 },
  level_moves: [],
  evolutions: [{ species: "UNSUPPORTED", method: "Item", parameter: "MOONSTONE" }],
};
const foeMaster = {
  id: "REALRUNFOE",
  name: "Real Run Foe",
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 1020,
  catch_rate: 255,
  base_stats: { HP: 20, ATTACK: 20, DEFENSE: 20, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 20 },
  level_moves: [],
  evolutions: [],
};
const newMoveMasters = {
  NEWONE: { id: "NEWONE", name: "New One", category: "Status", power: 0, accuracy: 100, total_pp: 11, priority: 0, type: "NORMAL", thaws_user: false },
  NEWTWO: { id: "NEWTWO", name: "New Two", category: "Status", power: 0, accuracy: 100, total_pp: 12, priority: 0, type: "NORMAL", thaws_user: false },
};
Object.assign(SAFARI_SPECIES_MASTERS, { REALRUNTEST: source, REALRUNTEST2: evolved, REALRUNFOE: foeMaster });
Object.assign(SAFARI_MOVE_MASTERS, newMoveMasters);

const initial = resolvePokemonRuntimeMasters({
  species: "REALRUNTEST",
  level: 10,
  exp: minimumExpForLevel("Medium", 10),
  personal_id: 987654321,
  gender: 0,
  form: 0,
  hp: 15,
  status: "POISON",
  status_count: 2,
  item: "BERRY",
  ability_id: "KEEPABILITY",
  ability_index: 1,
  nature_id: "HARDY",
  iv: zeroStats,
  ev: zeroStats,
  moves: [
    { id: "TACKLE", pp: 3, ppup: 0 },
    { id: "QUICKATTACK", pp: 4, ppup: 0 },
    { id: "BITE", pp: 5, ppup: 0 },
    { id: "SWIFT", pp: 6, ppup: 0 },
  ],
}, {
  species_master: source,
  nature_master: { id: "HARDY", stat_changes: [] },
  move_masters: SAFARI_MOVE_MASTERS,
});
initial.hp = 15;
const runtime = {
  player: { party: [initial] },
  variables: { mapless: { battle: { completed: false, player_party_index: 0 } } },
};
setSafariBattleMoveLearningDecision(runtime, { level: 11, moveId: "NEWONE", forgetIndex: 1 });
setSafariBattleMoveLearningDecision(runtime, { level: 12, moveId: "NEWTWO", forgetIndex: 2 });

const defeatedFoe = { species: "REALRUNFOE", level: 10 };
const expInput = normalBattleExpInput(runtime.player.party[0], defeatedFoe, false);
assert.deepEqual(expInput.moveDecisions, {
  "11:NEWONE": { forgetIndex: 1 },
  "12:NEWTWO": { forgetIndex: 2 },
}, "explicit Safari battle move-learning decisions must reach the Battle EXP owner");

const committed = commitBattleSystemsExpRuntime({
  pokemon: runtime.player.party[0],
  battleInput: { rounds: [{ actions: [{ postHitResolution: { operations: [{ op: "gain_exp_request" }] }, battleExpInput: expInput }] }] },
  turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
});
const after = committed.pokemon;
assert.equal(after.level, 12, "Safari EXP owner must cross both level 11 and level 12");
assert.equal(after.species, "REALRUNTEST2", "Level evolution must execute after Safari EXP growth");
assert.equal(after.form, 1, "evolution target form must be applied");
assert.deepEqual(after.moves.map((move) => move.id), ["TACKLE", "NEWONE", "NEWTWO", "SWIFT"]);
assert.equal(after.moves[0].pp, 3, "untouched move PP must not refill");
assert.equal(after.moves[3].pp, 6, "untouched move PP must not refill");
assert.equal(after.personal_id, initial.personal_id, "evolution must keep individual identity");
assert.equal(after.item, "BERRY", "held item must survive");
assert.equal(after.status, "POISON", "status must survive");
assert.equal(after.status_count, 2, "status counter must survive");
assert.equal(after.ability_id, "KEEPABILITY", "ability identity must survive");
assert.equal(after.ability_index, 1, "ability slot must survive");
assert.equal(Object.prototype.hasOwnProperty.call(after, "__battle_move_decisions"), false, "battle-only choices must not leak into persisted Pokemon state");
assert.ok(after.max_hp > initial.max_hp, "level/evolution fixture must increase max HP");
assert.equal(after.hp, initial.hp + (after.max_hp - initial.max_hp), "injured current HP must track the exact canonical max-HP delta rather than full-heal");
assert.deepEqual(committed.commits[0].evolution, { from: "REALRUNTEST", to: "REALRUNTEST2", method: "Level", parameter: 12 });
assert.deepEqual(committed.commits[0].unsupportedEvolutionMethods, ["Item"], "unsupported evolution methods on the evolved species must stay explicit in the real-run commit");

const saved = saveRunState({ player: { party: [after] } }, { valueIds: ["player"] });
const fresh = loadRunState(saved.payload, {}, { valueIds: ["player"] }).state;
assert.deepEqual(fresh.player.party[0], after, "fresh Continue must preserve the evolved individual exactly");

const faintedRuntime = {
  player: { party: [structuredClone(initial)] },
  variables: { mapless: { battle: { completed: false, player_party_index: 0 } } },
};
faintedRuntime.player.party[0].hp = 0;
setSafariBattleMoveLearningDecision(faintedRuntime, { level: 11, moveId: "NEWONE", forgetIndex: 1 });
setSafariBattleMoveLearningDecision(faintedRuntime, { level: 12, moveId: "NEWTWO", forgetIndex: 2 });
const faintedExpInput = normalBattleExpInput(faintedRuntime.player.party[0], defeatedFoe, false);
const faintedCommitted = commitBattleSystemsExpRuntime({
  pokemon: faintedRuntime.player.party[0],
  battleInput: { rounds: [{ actions: [{ postHitResolution: { operations: [{ op: "gain_exp_request" }] }, battleExpInput: faintedExpInput }] }] },
  turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
});
assert.equal(faintedCommitted.pokemon.level, 12, "fainted real-run branch must still receive the same multi-level EXP growth");
assert.equal(faintedCommitted.pokemon.species, "REALRUNTEST2", "fainted real-run branch must still resolve eligible Level evolution");
assert.ok(faintedCommitted.pokemon.max_hp > initial.max_hp, "fainted fixture must exercise a positive max-HP delta");
assert.equal(faintedCommitted.pokemon.hp, 0, "level/evolution stat growth must not revive a fainted Pokemon");
const faintedSaved = saveRunState({ player: { party: [faintedCommitted.pokemon] } }, { valueIds: ["player"] });
const faintedFresh = loadRunState(faintedSaved.payload, {}, { valueIds: ["player"] }).state;
assert.equal(faintedFresh.player.party[0].hp, 0, "fresh Continue must preserve fainted HP after level/evolution");
assert.equal(faintedFresh.player.party[0].personal_id, initial.personal_id, "fainted evolution must preserve individual identity through Continue");

console.log("Safari Battle EXP move choice -> multi-level moves -> Level evolution -> canonical HP -> Save/Continue: PASS");
