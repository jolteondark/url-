import assert from 'node:assert/strict';
import { resolveMaplessPokemonCenterHealing } from '../runtime/mapless-pokemon-center-healing.js';

const player = { party: [{}] };
const first = resolveMaplessPokemonCenterHealing({ player });
assert.equal(first.healed, true);
assert.equal(player.stats.poke_center_count, 1);
assert.equal(first.operations.find((op) => op.op === 'increment_stat')?.canonicalStat, 'poke_center_count');
assert.equal(first.operations.find((op) => op.op === 'increment_stat')?.value, 1);
assert.equal(first.operations.some((op) => op.op === 'request_save' && op.reason === 'pokemon_center_healed'), true);

const second = resolveMaplessPokemonCenterHealing({ player });
assert.equal(player.stats.poke_center_count, 2);
assert.equal(second.operations.find((op) => op.op === 'increment_stat')?.value, 2);

const invalidPlayer = { party: null, stats: { poke_center_count: 7 } };
const failed = resolveMaplessPokemonCenterHealing({ player: invalidPlayer });
assert.equal(failed.healed, false);
assert.equal(invalidPlayer.stats.poke_center_count, 7);
assert.equal(failed.operations.some((op) => op.op === 'request_save'), false);

console.log('pokemon center stat persistence smoke: ok');
