import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../runtime/safari-berry-juice-shop-interaction.js', import.meta.url), 'utf8');

assert.match(
  source,
  /\{ op:"request_save", reason:"berry_juice_shop_progress" \}/,
  'Berry Juice Shop commit must retain the owner-operation save intent',
);
assert.match(
  source,
  /persistenceRequested:state\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  'successful Berry Juice Shop transactions must project persistence from committed operations',
);
assert.match(
  source,
  /persistenceRequested:committed\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  'Berry Juice Shop leave must project persistence from committed operations',
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*true/,
  'Berry Juice Shop adapter must not retain an independent persistence boolean truth',
);
assert.match(
  source,
  /function stopped[\s\S]*?persistenceRequested:false/,
  'failed/preflight-stopped routes must remain fail-closed without a persistence request',
);

console.log('berry juice shop owner-persistence smoke: ok');
