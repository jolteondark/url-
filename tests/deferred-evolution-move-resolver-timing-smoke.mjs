import assert from "node:assert/strict";
import { commitBattleSystemsExpRuntime } from "../runtime/battle-exp-runtime-integration.js";
import { minimumExpForLevel } from "../runtime/pokemon-growth-rate.js";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";
import { resolvePokemonRuntimeMasters } from "../runtime/pokemon-runtime-masters.js";
import { normalBattleExpInput } from "../runtime/safari-normal-battle-finalize.js";
import { SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS } from "../runtime/safari-playable-data.js";

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const source = {
  id: "DEFERPROMPTSOURCE",
  name: "Deferred Prompt Source",
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 60,
  catch_rate: 255,
  base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
  level_moves: [],
  evolutions: [{ species: "DEFERPROMPTTARGET", method: "Level", parameter: 12 }],
};
const target = {
  id: "DEFERPROMPTTARGET",
  name: "Deferred Prompt Target",
  form: 0,
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 120,
  catch_rate: 255,
  base_stats: { HP: 60, ATTACK: 55, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 45 },
  level_moves: [{ level: 0, move: "EVOLVEONE" }],
  evolutions: [],
};
const foe = {
  id: "DEFERPROMPTFOE",
  name: "Deferred Prompt Foe",
  types: ["NORMAL"],
  growth_rate: "Medium",
  base_exp: 1020,
  catch_rate: 255,
  base_stats: { HP: 20, ATTACK: 20, DEFENSE: 20, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 20 },
  level_moves: [],
  evolutions: [],
};
const evolveMove = {
  id: "EVOLVEONE",
  name: "Evolve One",
  category: "Status",
  power: 0,
  accuracy: 100,
  total_pp: 9,
  priority: 0,
  type: "NORMAL",
  thaws_user: false,
};

Object.assign(SAFARI_SPECIES_MASTERS, {
  DEFERPROMPTSOURCE: source,
  DEFERPROMPTTARGET: target,
  DEFERPROMPTFOE: foe,
});
Object.assign(SAFARI_MOVE_MASTERS, { EVOLVEONE: evolveMove });

const initial = resolvePokemonRuntimeMasters({
  species: "DEFERPROMPTSOURCE",
  level: 10,
  exp: minimumExpForLevel("Medium", 10),
  personal_id: 246813579,
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

let resolverCalls = 0;
const previousResolver = globalThis.__maplessSafariMoveLearningResolver;
globalThis.__maplessSafariMoveLearningResolver = () => {
  resolverCalls += 1;
  return { forgetIndex: 1 };
};

try {
  const deferredEvolutionInput = {
    ...normalBattleExpInput(initial, { species: "DEFERPROMPTFOE", level: 10 }, false),
    deferCommit: false,
  };
  assert.equal(deferredEvolutionInput.deferEvolution, true);

  const committed = commitBattleSystemsExpRuntime({
    pokemon: initial,
    battleInput: {
      rounds: [{ actions: [{
        postHitResolution: { operations: [{ op: "gain_exp_request" }] },
        battleExpInput: deferredEvolutionInput,
      }] }],
    },
    turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
  });

  assert.equal(committed.pokemon.level, 12, "EXP growth must still reach the eligible Level evolution threshold");
  assert.equal(committed.pokemon.species, "DEFERPROMPTSOURCE", "deferred evolution probe must not evolve before terminal REWARD_GROWTH");
  assert.equal(committed.pokemon.__battle_level_evolution_pending, true, "eligible Level evolution must remain pending");
  assert.equal(committed.commits[0].evolutionDeferred, true);
  assert.deepEqual(committed.commits[0].pendingEvolution, { to: "DEFERPROMPTTARGET", method: "Level", parameter: 12 });
  assert.equal(resolverCalls, 0, "eligibility-only deferred probe must never invoke the live move-learning resolver");

  const terminalCandidate = { ...committed.pokemon };
  delete terminalCandidate.__battle_level_evolution_pending;
  const terminalEvolution = resolvePokemonLevelEvolution(terminalCandidate, {
    species_masters: SAFARI_SPECIES_MASTERS,
    nature_master: { id: "HARDY", stat_changes: [] },
    move_masters: SAFARI_MOVE_MASTERS,
  });

  assert.equal(terminalEvolution.evolved, true, "terminal evolution owner must still perform the eligible Level evolution");
  assert.equal(terminalEvolution.pokemon.species, "DEFERPROMPTTARGET");
  assert.equal(resolverCalls, 1, "evolution move selection must occur exactly once when terminal evolution actually executes");
  assert.deepEqual(terminalEvolution.pokemon.moves.map((move) => move.id), ["TACKLE", "EVOLVEONE", "BITE", "SWIFT"]);
  assert.equal(terminalEvolution.pokemon.moves[0].pp, 3, "untouched PP must remain current rather than refill");
  assert.equal(terminalEvolution.pokemon.moves[2].pp, 5);
  assert.equal(terminalEvolution.pokemon.moves[3].pp, 6);
  assert.equal(terminalEvolution.pokemon.personal_id, initial.personal_id, "terminal evolution must preserve individual identity");
} finally {
  if (previousResolver === undefined) delete globalThis.__maplessSafariMoveLearningResolver;
  else globalThis.__maplessSafariMoveLearningResolver = previousResolver;
}

console.log("Deferred Level evolution does not prompt evolution moves before terminal REWARD_GROWTH: PASS");
