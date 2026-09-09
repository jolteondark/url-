import fs from 'node:fs';
import assert from 'node:assert/strict';

const runtime = fs.readFileSync(new URL('../runtime/safari-treasure-chest-interaction.js', import.meta.url), 'utf8');

assert.match(runtime, /function persistenceRequested\(operations = \[\]\)/);
assert.match(runtime, /\{ op:["']request_save["'], reason:["']treasure_opened["'] \}/);
assert.doesNotMatch(runtime, /persistenceRequested:\s*true/);
assert.match(runtime, /persistenceRequested:persistenceRequested\(state\.last_operations\)/);
assert.match(runtime, /if \(!receipt\.success\)/);
assert.match(runtime, /consumed:false/);
assert.match(runtime, /result:["']treasure_hydration_missing["']/);

console.log('treasure chest owner persistence smoke: ok');
