import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../runtime/safari-trainer-camp-interaction.js', import.meta.url), 'utf8');

assert.match(source, /\{ op:"request_save", reason:"trainer_camp_resolved" \}/);
assert.match(source, /function persistenceRequested\(state\)/);
assert.match(source, /operation\?\.op === "request_save"/);
assert.doesNotMatch(source, /persistenceRequested:\s*true/);
assert.equal((source.match(/persistenceRequested:persistenceRequested\(state\)/g) ?? []).length, 4);
assert.match(source, /persistenceRequested:false/);

console.log('trainer camp owner-persistence smoke: ok');
