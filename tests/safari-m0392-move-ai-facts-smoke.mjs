import assert from 'node:assert/strict';
import { safariGeneralMoveAiFacts } from '../runtime/safari-general-encounter-data-loader.js';
import { SAFARI_MOVE_MASTERS } from '../runtime/safari-playable-data.js';
import { buildTrainerMoveChoicesFromBattleStateCanonical } from '../runtime/battle-core-trainer-choice-pipeline.js';

assert.deepEqual(safariGeneralMoveAiFacts('BURNUP', 70), { type: 'FIRE', thaws_user: true });
assert.deepEqual(safariGeneralMoveAiFacts('SCALD', 441), { type: 'WATER', thaws_user: true });
assert.equal(SAFARI_MOVE_MASTERS.TACKLE.type, 'NORMAL');
assert.equal(SAFARI_MOVE_MASTERS.THUNDERSHOCK.type, 'ELECTRIC');

const pokemon = (status = null) => ({
  level: 50,
  hp: 100,
  max_hp: 100,
  status,
  stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100 },
});
const scald = { id: 'SCALD', category: 'Special', power: 80, accuracy: 100, type: 'WATER', thaws_user: true };
const waterPulse = { id: 'WATERPULSE', category: 'Special', power: 80, accuracy: 100, type: 'WATER', thaws_user: false };
const choices = buildTrainerMoveChoicesFromBattleStateCanonical([
  { moveIndex: 0, targetIndex: 0, userPokemon: pokemon('FROZEN'), targetPokemon: pokemon(), moveMaster: scald, skill: 32 },
  { moveIndex: 1, targetIndex: 0, userPokemon: pokemon('FROZEN'), targetPokemon: pokemon(), moveMaster: waterPulse, skill: 32 },
]);
assert.ok(choices[0].score > choices[1].score);
assert.ok(choices[0].generalStateScoreProjection.trace.some((entry) => entry.kind === 'thaw_frozen_user'));
assert.ok(choices[1].generalStateScoreProjection.trace.some((entry) => entry.kind === 'prefer_other_thawing_move'));
console.log('safari-m0392-move-ai-facts-smoke: ok');
