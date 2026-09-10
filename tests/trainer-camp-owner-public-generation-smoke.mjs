import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../runtime/safari-trainer-camp-interaction.js', import.meta.url), 'utf8');

assert.match(index, /\.\/runtime\/safari-trainer-camp-interaction\.js\?v=20260911-0000/);
assert.doesNotMatch(index, /\.\/runtime\/safari-trainer-camp-interaction\.js\?v=20260908-0710/);
assert.match(source, /\{ op:"request_save", reason:"trainer_camp_resolved" \}/);
assert.match(source, /function persistenceRequested\(state\)/);
assert.match(source, /operation\?\.op === "request_save"/);
assert.doesNotMatch(source, /persistenceRequested:\s*true/);
assert.equal((source.match(/persistenceRequested:persistenceRequested\(state\)/g) ?? []).length, 4);

console.log('trainer camp owner public generation smoke: ok');
