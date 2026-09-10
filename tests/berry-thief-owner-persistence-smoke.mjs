import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../runtime/safari-berry-thief-interaction.js', import.meta.url), 'utf8');

assert.match(
  source,
  /function ensureResolvedSaveIntent\(operations, reason\)/,
  'Berry Thief must have one owner-operation save-intent convergence helper',
);
assert.match(
  source,
  /state\.last_operations = ensureResolvedSaveIntent\([^;]+"berry_thief_leave"\)/s,
  'revisit plain leave must append the authoritative save intent even when initial theft is already applied',
);
assert.match(
  source,
  /"berry_thief_leave_join"/,
  'leave_join must converge on owner request_save operations',
);
assert.match(
  source,
  /"berry_thief_leave_rare_berry"/,
  'leave_rare_berry must converge on owner request_save operations',
);
assert.match(
  source,
  /"berry_thief_battle_started"/,
  'Battle start must converge on owner request_save operations',
);
assert.match(
  source,
  /"normal_event_post_battle"/,
  'Battle RETURN must converge on owner request_save operations',
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*true/,
  'Berry Thief adapter must not retain an independent persistence boolean truth',
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*theft\.changed/,
  'failure/no-op routes must project persistence from committed operations rather than mutation booleans',
);

console.log('berry thief owner-persistence smoke: ok');
