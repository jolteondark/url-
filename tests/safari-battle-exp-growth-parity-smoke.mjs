import assert from "node:assert/strict";
import {
  levelFromExp,
  maximumExpForGrowthRate,
  minimumExpForLevel,
} from "../runtime/pokemon-growth-rate.js";
import {
  calculateMaplessBattleExp,
  maplessLevelGapMultiplier,
} from "../runtime/mapless-experience-rules.js";
import { resolveSafariBattleExpGrowthInput } from "../runtime/safari-battle-exp-growth-owner.js";
import { resolveExpLevelMoveFlow } from "../runtime/battle-exp-level-move-flow.js";

assert.equal(minimumExpForLevel("Medium", 10), 1000);
assert.equal(minimumExpForLevel("Medium", 11), 1331);
assert.equal(maximumExpForGrowthRate("Medium"), 1_000_000);
assert.equal(maximumExpForGrowthRate("Slow"), 1_250_000);
assert.equal(maximumExpForGrowthRate("Fast"), 800_000);
assert.equal(maximumExpForGrowthRate("Erratic"), 600_000);
assert.equal(maximumExpForGrowthRate("Fluctuating"), 1_640_000);
assert.equal(maximumExpForGrowthRate("Parabolic"), 1_059_860);
assert.equal(levelFromExp("Medium", 1330), 10);
assert.equal(levelFromExp("Medium", 1331), 11);
assert.equal(levelFromExp("Fast", minimumExpForLevel("Fast", 99)), 99);
assert.equal(levelFromExp("Fast", 800_000), 100);
assert.equal(levelFromExp("Slow", minimumExpForLevel("Slow", 99)), 99);
assert.equal(levelFromExp("Slow", 1_250_000), 100);

assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map((gap) => maplessLevelGapMultiplier(20 + gap, 20)), [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3]);
assert.equal(calculateMaplessBattleExp({ defeatedLevel: 10, baseExp: 70, gainerLevel: 10, trainerBattle: false, moreExpFromTrainerPokemon: false, scaledExpFormula: false }), 50);
assert.equal(calculateMaplessBattleExp({ defeatedLevel: 10, baseExp: 70, gainerLevel: 17, trainerBattle: false, moreExpFromTrainerPokemon: false, scaledExpFormula: false }), 15);

const mediumSpecies = {
  id: "TEST_MEDIUM",
  growth_rate: "Medium",
  level_moves: [{ level: 10, move: "OLDMOVE" }, { level: 11, move: "NEWMOVE" }],
};
const foeSpecies = { id: "TEST_FOE", base_exp: 70 };
const mediumInput = resolveSafariBattleExpGrowthInput(
  { species: "TEST_MEDIUM", level: 10 },
  { species: "TEST_FOE", level: 10 },
  mediumSpecies,
  foeSpecies,
  false,
);
const level11 = resolveExpLevelMoveFlow({
  pokemon: { exp: minimumExpForLevel("Medium", 11) - 1, level: 10, moves: ["OLDMOVE"] },
  ...mediumInput,
});
assert.equal(level11.pokemon.level, 11);
assert.ok(level11.pokemon.moves.includes("NEWMOVE"));
assert.equal(level11.pokemon.exp >= minimumExpForLevel("Medium", 11), true);

const fastInput = resolveSafariBattleExpGrowthInput(
  { species: "TEST_FAST", level: 99 },
  { species: "TEST_FOE", level: 100 },
  { id: "TEST_FAST", growth_rate: "Fast", level_moves: [{ level: 100, move: "FINALMOVE" }] },
  { id: "TEST_FOE", base_exp: 5000 },
  false,
);
const level100 = resolveExpLevelMoveFlow({
  pokemon: { exp: minimumExpForLevel("Fast", 100) - 1, level: 99, moves: [] },
  ...fastInput,
});
assert.equal(level100.pokemon.level, 100);
assert.equal(level100.pokemon.exp, 800_000);
assert.deepEqual(level100.pokemon.moves, ["FINALMOVE"]);

console.log("Safari Battle EXP/growth canonical parity smoke: PASS");
