import assert from "node:assert/strict";
import { commitBattleSystemsExpRuntime } from "../runtime/battle-exp-runtime-integration.js";

function pokemon() {
  return {
    species: "TESTMON",
    form: 0,
    level: 10,
    exp: 1000,
    personal_id: 12345,
    gender: 0,
    moves: [],
    hp: 20,
    status: "NONE",
    status_count: 0,
    item: "SOOTHEBELL",
    ability_id: null,
    happiness: 99,
    obtain_map: 7,
    poke_ball: "LUXURYBALL",
  };
}

function battleExpInput(overrides = {}) {
  return {
    maximumExp: 100000,
    levelThresholds: { 11: 2000, 12: 3000 },
    movesByLevel: {},
    maxMoves: 4,
    expContext: {
      defeatedLevel: 10,
      baseExp: 1400,
      numParticipants: 1,
      expShareCount: 0,
      participant: true,
      hasExpShare: false,
      expAll: false,
      splitExpBetweenGainers: false,
      moreExpFromTrainerPokemon: false,
      trainerBattle: false,
      scaledExpFormula: false,
    },
    happinessContext: { currentMapId: 7, applyHappinessSoftCap: false },
    ...overrides,
  };
}

function commit(input) {
  return commitBattleSystemsExpRuntime({
    pokemon: pokemon(),
    battleInput: {
      rounds: [{ actions: [{
        postHitResolution: { operations: [{ op: "gain_exp_request" }] },
        battleExpInput: input,
      }] }],
    },
    turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
  });
}

{
  const result = commit(battleExpInput());
  assert.equal(result.pokemon.level, 12);
  // Lv10->11: (5 base + same-map + Luxury Ball) * 1.5 Soothe Bell = floor(10.5) = 10.
  // Lv11->12: (4 base + same-map + Luxury Ball) * 1.5 Soothe Bell = 9.
  assert.equal(result.pokemon.happiness, 118);
  assert.equal(result.pokemon.item, "SOOTHEBELL");
  assert.equal(result.pokemon.poke_ball, "LUXURYBALL");
  assert.equal(result.pokemon.obtain_map, 7);
  assert.equal(result.commits[0].operations.filter((op) => op.op === "change_happiness" && op.reason === "levelup").length, 2);
}

{
  const result = commit(battleExpInput({ activeBattler: false }));
  assert.equal(result.pokemon.level, 12);
  assert.equal(result.pokemon.happiness, 99, "off-field EXP recipients must not receive battler-only level-up happiness");
}

{
  const capped = pokemon();
  capped.happiness = 178;
  const result = commitBattleSystemsExpRuntime({
    pokemon: capped,
    battleInput: {
      rounds: [{ actions: [{
        postHitResolution: { operations: [{ op: "gain_exp_request" }] },
        battleExpInput: battleExpInput({ happinessContext: { currentMapId: 7, applyHappinessSoftCap: true } }),
      }] }],
    },
    turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
  });
  assert.equal(result.pokemon.happiness, 179, "soft cap must clamp the first gain and suppress later gains");
}

console.log("battle EXP level-up happiness runtime smoke: PASS");
