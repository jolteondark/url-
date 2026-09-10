import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../runtime/safari-berry-contest-interaction.js', import.meta.url), 'utf8');

assert.match(
  source,
  /\{ op:"request_save", reason:"berry_contest_resolved" \}/,
  'Berry Contest commit must retain the owner-operation save intent',
);
assert.match(
  source,
  /persistenceRequested:state\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  'Berry Contest successful result must project persistence from committed request_save operations',
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*true/,
  'Berry Contest adapter must not retain an independent persistence boolean truth',
);
assert.match(
  source,
  /if \(!resolved\.success\)[\s\S]*?persistenceRequested:false/,
  'failed Bag preflight must remain fail-closed without a persistence request',
);

console.log('berry contest owner-persistence smoke: ok');
