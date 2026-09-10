import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../runtime/safari-lost-bag-interaction.js', import.meta.url), 'utf8');

assert.match(source, /\{ op:"request_save", reason:"lost_bag_resolved" \}/);
assert.match(source, /function persistenceRequested\(state\)/);
assert.match(source, /operation\?\.op === "request_save"/);
assert.doesNotMatch(source, /persistenceRequested:\s*true/);
assert.match(source, /persistenceRequested:persistenceRequested\(state\)/);
assert.match(source, /persistenceRequested:false/);

console.log('lost bag persistence projection smoke: ok');
