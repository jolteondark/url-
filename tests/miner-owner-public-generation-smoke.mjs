import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../runtime/safari-miner-interaction.js', import.meta.url), 'utf8');

assert.match(html, /\.\/runtime\/safari-miner-interaction\.js\?v=20260910-0658/);
assert.doesNotMatch(html, /\.\/runtime\/safari-miner-interaction\.js\?v=20260904-2300/);
assert.match(runtime, /function operationsRequestSave\(operations = \[\]\)/);
assert.match(runtime, /persistenceRequested:operationsRequestSave\(state\.last_operations\)/);
assert.doesNotMatch(runtime, /persistenceRequested:true/);
assert.match(runtime, /\{ op:"request_save", reason:"miner_attempt" \}/);

console.log('miner owner public generation smoke: ok');
