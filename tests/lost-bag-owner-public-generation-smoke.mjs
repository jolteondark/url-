import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../runtime/safari-lost-bag-interaction.js', import.meta.url), 'utf8');

assert.match(index, /\.\/runtime\/safari-lost-bag-interaction\.js\?v=20260910-2300/);
assert.doesNotMatch(index, /\.\/runtime\/safari-lost-bag-interaction\.js\?v=20260904-2000/);
assert.match(source, /\{ op:"request_save", reason:"lost_bag_resolved" \}/);
assert.match(source, /function persistenceRequested\(state\)/);
assert.match(source, /operation\?\.op === "request_save"/);
assert.doesNotMatch(source, /persistenceRequested:\s*true/);
assert.match(source, /persistenceRequested:persistenceRequested\(state\)/);

console.log('lost bag owner public generation smoke: ok');
