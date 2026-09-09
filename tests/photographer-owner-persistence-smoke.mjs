import fs from 'node:fs';
import assert from 'node:assert/strict';

const runtime = fs.readFileSync(new URL('../runtime/safari-photographer-interaction.js', import.meta.url), 'utf8');

assert.match(runtime, /function persistenceRequested\(operations\)/);
assert.match(runtime, /operations\.push\(\{ op:["']request_save["'], reason \}\)/);
assert.match(runtime, /reason = ["']photographer_resolved["']/);
assert.match(runtime, /["']normal_event_post_battle["']/);
assert.doesNotMatch(runtime, /persistenceRequested:\s*true/);
assert.match(runtime, /persistenceRequested:persistenceRequested\(state\.last_operations\)/);
assert.match(runtime, /registerSafariNormalEventBattleContinuation\(["']photographer["']/);
assert.match(runtime, /commitSafariBagEconomyReceipt/);
assert.match(runtime, /projectMaplessNormalEventOptionalReward/);

console.log('photographer owner persistence smoke: ok');
