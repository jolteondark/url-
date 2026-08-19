import assert from "node:assert/strict";
import { resolveExpLevelMoveFlow } from "../runtime/battle-exp-level-move-flow.js";
import { createSafariBrowserMoveLearningResolver } from "../runtime/safari-browser-move-learning-resolver.js";
import { minimumExpForLevel } from "../runtime/pokemon-growth-rate.js";

const answers = ["2", "3"];
const prompts = [];
const resolver = createSafariBrowserMoveLearningResolver({
  promptFn(message) {
    prompts.push(message);
    return answers.shift();
  },
});

const result = resolveExpLevelMoveFlow({
  pokemon: {
    level: 10,
    exp: minimumExpForLevel("Medium", 10),
    moves: ["TACKLE", "QUICKATTACK", "BITE", "SWIFT"],
  },
  growthRate: "Medium",
  maxMoves: 4,
  expContext: {
    defeatedLevel: 10,
    baseExp: 700,
    numParticipants: 1,
    participant: true,
    splitExpBetweenGainers: true,
    maplessExperienceRules: false,
    trainerBattle: false,
    moreExpFromTrainerPokemon: false,
    scaledExpFormula: false,
  },
  movesByLevel: {
    11: ["NEWONE"],
    12: ["NEWTWO"],
  },
  moveDecisions: {},
  moveDecisionResolver: resolver,
});

assert.equal(result.pokemon.level, 12, "EXP must cross both levels");
assert.deepEqual(result.pokemon.moves, ["TACKLE", "NEWONE", "NEWTWO", "SWIFT"], "player choices must replace the selected slots in level order");
assert.equal(prompts.length, 2, "each full-moveset level-up move must ask exactly once");
assert.match(prompts[0], /Lv\.11/);
assert.match(prompts[0], /NEWONE|New One/i);
assert.match(prompts[1], /Lv\.12/);

const explicitWins = resolveExpLevelMoveFlow({
  pokemon: {
    level: 10,
    exp: minimumExpForLevel("Medium", 10),
    moves: ["TACKLE", "QUICKATTACK", "BITE", "SWIFT"],
  },
  growthRate: "Medium",
  maxMoves: 4,
  expContext: {
    defeatedLevel: 10,
    baseExp: 700,
    numParticipants: 1,
    participant: true,
    splitExpBetweenGainers: true,
    maplessExperienceRules: false,
    trainerBattle: false,
    moreExpFromTrainerPokemon: false,
    scaledExpFormula: false,
  },
  movesByLevel: { 11: ["NEWONE"] },
  moveDecisions: { "11:NEWONE": { forgetIndex: 0 } },
  moveDecisionResolver() { throw new Error("resolver must not run when an explicit decision already exists"); },
});
assert.equal(explicitWins.pokemon.moves[0], "NEWONE", "pre-recorded explicit decisions must remain authoritative");

const declineResolver = createSafariBrowserMoveLearningResolver({ promptFn: () => "" });
assert.deepEqual(
  declineResolver({ level: 11, move: "NEWONE", moves: ["TACKLE", "QUICKATTACK", "BITE", "SWIFT"] }),
  { decline: true },
  "cancel/blank must preserve the existing decline behavior",
);

console.log("Safari real move-learning player input -> multi-level move replacement: PASS");
