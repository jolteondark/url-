import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../runtime/safari-wishing-fountain-interaction.js', import.meta.url), 'utf8');

assert.match(source, /\{ op:"request_save", reason:"wishing_fountain_resolved" \}/);
assert.match(source, /function persistenceRequested\(state\)/);
assert.match(source, /operation\?\.op === "request_save"/);
assert.doesNotMatch(source, /persistenceRequested:true/);
assert.equal((source.match(/persistenceRequested:persistenceRequested\(state\)/g) ?? []).length, 5);
assert.match(source, /const largePrice = 1200 \+ scalingValue\(runtime\) \* 200;/);

console.log('wishing fountain owner persistence smoke: ok');
