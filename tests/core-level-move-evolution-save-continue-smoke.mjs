import assert from "node:assert/strict";
import { commitBattleSystemsExpRuntime } from "../runtime/battle-exp-runtime-integration.js";
import { minimumExpForLevel } from "../runtime/pokemon-growth-rate.js";
import { resolvePokemonRuntimeMasters } from "../runtime/pokemon-runtime-masters.js";
import { loadRunState, saveRunState } from "../runtime/run-persistence.js";

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const source = {
  id: "TESTMON",
  growth_rate: "Medium",
  base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
  level_moves: [
    { level: 11, move: "NEWONE" },
    { level: 12, move: "NEWTWO" },
  ],
  evolutions: [
    { species: "TESTMON2", method: "Level", parameter: 12 },
    { species: "TESTMON3", method: "Item", parameter: "MOONSTONE" },
  ],
};
const evolved = {
  id: "TESTMON2",
  form: 1,
  growth_rate: "Medium",
  base_stats: { HP: 70, ATTACK: 65, DEFENSE: 60, SPECIAL_ATTACK: 55, SPECIAL_DEFENSE: 60, SPEED: 50 },
  level_moves: [
    { level: 0, move: "EVOLVEZERO" },
    { level: 12, move: "EVOLVETWELVE" },
    { level: 13, move: "NOTYET" },
  ],
  evolutions: [{ species: "TESTMON3", method: "Item", parameter: "MOONSTONE" }],
};
const foe = { id: "FOE", base_exp: 500 };
const nature = { id: "HARDY", stat_changes: [] };
const moveMasters = Object.fromEntries(
  ["OLD1", "OLD2", "OLD3", "OLD4", "NEWONE", "NEWTWO", "EVOLVEZERO", "EVOLVETWELVE", "NOTYET"]
    .map((id, index) => [id, { id, total_pp: 10 + index }]),
);

const initial = resolvePokemonRuntimeMasters({
  species: "TESTMON",
  level: 10,
  exp: minimumExpForLevel("Medium", 10),
  personal_id: 123456789,
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
    { id: "OLD1", pp: 3, ppup: 0 },
    { id: "OLD2", pp: 4, ppup: 1 },
    { id: "OLD3", pp: 5, ppup: 0 },
    { id: "OLD4", pp: 6, ppup: 0 },
  ],
}, {
  species_master: source,
  nature_master: nature,
  move_masters: moveMasters,
});
const initialHp = initial.hp;
const initialMaxHp = initial.max_hp;

const battleExpInput = {
  growthRate: source.growth_rate,
  maximumExp: 1_000_000,
  maxMoves: 4,
  expContext: {
    defeatedLevel: 12,
    baseExp: foe.base_exp,
    numParticipants: 1,
    expShareCount: 0,
    participant: true,
    hasExpShare: false,
    expAll: false,
    splitExpBetweenGainers: true,
    trainerBattle: false,
    moreExpFromTrainerPokemon: false,
    scaledExpFormula: false,
  },
  movesByLevel: { 11: ["NEWONE"], 12: ["NEWTWO"] },
  moveDecisions: {
    "11:NEWONE": { forgetIndex: 1 },
    "12:NEWTWO": { forgetIndex: 2 },
    "12:EVOLVEZERO": { forgetIndex: 0 },
    "12:EVOLVETWELVE": { forgetIndex: 3 },
  },
  runtimeMasters: {
    species_master: source,
    nature_master: nature,
    move_masters: moveMasters,
  },
  evolutionMasters: {
    species_masters: { TESTMON: source, TESTMON2: evolved },
    nature_master: nature,
    move_masters: moveMasters,
  },
};

const committed = commitBattleSystemsExpRuntime({
  pokemon: initial,
  battleInput: {
    rounds: [{ actions: [{
      postHitResolution: { operations: [{ op: "gain_exp_request" }] },
      battleExpInput,
    }] }],
  },
  turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
});
const after = committed.pokemon;
assert.equal(after.level, 12, "Battle EXP must cross exactly levels 11 and 12 in this vertical");
assert.equal(after.species, "TESTMON2", "eligible Level evolution must commit after level-up");
assert.equal(after.form, 1, "target canonical form must be applied");
assert.equal(after.personal_id, initial.personal_id, "evolution must not create a new individual");
assert.equal(after.item, "BERRY", "held item must survive evolution");
assert.equal(after.status, "POISON", "status must survive evolution");
assert.equal(after.status_count, 2, "status counter must survive evolution");
assert.equal(after.ability_id, "KEEPABILITY", "ability identity must not disappear during evolution");
assert.equal(after.ability_index, 1, "ability slot continuity must survive evolution");
assert.deepEqual(
  after.moves.map((move) => move.id),
  ["EVOLVEZERO", "NEWONE", "NEWTWO", "EVOLVETWELVE"],
  "evolved species must learn both level-0 and current-level evolution moves after species change",
);
assert.equal(after.moves[1].pp, moveMasters.NEWONE.total_pp, "pre-evolution level-up move PP must stay full");
assert.equal(after.moves[2].pp, moveMasters.NEWTWO.total_pp, "pre-evolution level-up move PP must stay full");
assert.equal(after.moves[0].pp, moveMasters.EVOLVEZERO.total_pp, "level-0 evolution move must start at canonical full PP");
assert.equal(after.moves[3].pp, moveMasters.EVOLVETWELVE.total_pp, "current-level evolution move must start at canonical full PP");
assert.equal(after.moves.some((move) => move.id === "NOTYET"), false, "unrelated future-level moves must not be learned on evolution");
assert.equal(after.max_hp > initialMaxHp, true, "level/evolution must recalculate max HP");
assert.equal(after.hp, initialHp + (after.max_hp - initialMaxHp), "current HP must follow canonical max-HP-delta handling");
assert.notEqual(after.hp, after.max_hp, "level/evolution must not full-heal an injured Pokemon");
assert.deepEqual(committed.commits[0].evolution, { from: "TESTMON", to: "TESTMON2", method: "Level", parameter: 12 });
assert.deepEqual(committed.commits[0].unsupportedEvolutionMethods, ["Item"], "unsupported evolution methods on the source species must remain explicit even when Level evolution succeeds");
assert.deepEqual(
  committed.commits[0].operations
    .filter((operation) => operation.reason === "evolution" && ["replace_move", "learn_move"].includes(operation.op))
    .map((operation) => operation.move),
  ["EVOLVEZERO", "EVOLVETWELVE"],
  "post-evolution move learning must be represented explicitly in the growth operations",
);

const saved = saveRunState({ player: { party: [after] } }, { valueIds: ["player"] });
const fresh = loadRunState(saved.payload, {}, { valueIds: ["player"] }).state;
assert.deepEqual(fresh.player.party[0], after, "fresh Continue must preserve the evolved individual and all runtime state");

console.log("Core level-up moves + post-evolution moves + Level evolution + Save/Continue vertical: PASS");
