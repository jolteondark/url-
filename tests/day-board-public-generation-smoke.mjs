import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const playableTurn = fs.readFileSync(new URL('../runtime/mapless-day-board-playable-turn.js', import.meta.url), 'utf8');
const advance = fs.readFileSync(new URL('../runtime/mapless-day-board-advance.js', import.meta.url), 'utf8');

const turnGeneration = './runtime/mapless-day-board-playable-turn.js?v=20260914-1600';
const advanceGeneration = './runtime/mapless-day-board-advance.js?v=20260914-1600';

assert.ok(index.includes(turnGeneration), 'served import map must publish the Day Board owner-result generation');
assert.ok(index.includes(advanceGeneration), 'served import map must publish the Day Board advance generation');
assert.ok(playableTurn.includes('...(Array.isArray(handler.operations) ? handler.operations : [])'), 'served Day Board turn must forward owner operations');
assert.ok(advance.includes('reason: "day_advanced"'), 'served Day Board advance must request persistence after confirmed regeneration');

console.log('day board public generation smoke: ok');
