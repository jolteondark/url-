import assert from 'node:assert/strict';
import {
  calculateMaplessBattleExp as calculateLegacy,
  maplessLevelGapMultiplier as legacyGap,
} from '../runtime/mapless-experience-rules.js';
import {
  calculateMaplessBattleExp as calculateNext,
  maplessLevelGapMultiplier as nextGap,
} from '../src-next/core/growth/mapless-experience.js';

for (let gap = 0; gap <= 8; gap += 1) {
  assert.equal(nextGap(20 + gap, 20), legacyGap(20 + gap, 20), `level gap ${gap}`);
}
const cases = [
  { defeatedLevel: 10, baseExp: 70, gainerLevel: 10, trainerBattle: false, moreExpFromTrainerPokemon: false, scaledExpFormula: false },
  { defeatedLevel: 10, baseExp: 70, gainerLevel: 17, trainerBattle: false, moreExpFromTrainerPokemon: false, scaledExpFormula: false },
  { defeatedLevel: 50, baseExp: 40, gainerLevel: 50, trainerBattle: false, moreExpFromTrainerPokemon: false, scaledExpFormula: false },
  { defeatedLevel: 25, baseExp: 120, gainerLevel: 22, trainerBattle: true, moreExpFromTrainerPokemon: true, scaledExpFormula: false },
  { defeatedLevel: 30, baseExp: 180, gainerLevel: 35, trainerBattle: true, moreExpFromTrainerPokemon: true, scaledExpFormula: true },
];
for (const input of cases) assert.equal(calculateNext(input), calculateLegacy(input), JSON.stringify(input));
assert.equal(calculateNext(cases[0]), 50);
assert.equal(calculateNext(cases[2]), 142);
console.log('New Core Mapless EXP matches canonical legacy oracle: ok');
