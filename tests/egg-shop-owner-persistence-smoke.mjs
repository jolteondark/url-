import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../runtime/safari-egg-shop-interaction.js', import.meta.url), 'utf8');

assert.match(
  source,
  /\{ op:"request_save", reason:"egg_shop_purchase" \}/,
  'Egg Shop purchase must retain the canonical owner save request operation',
);
assert.match(
  source,
  /persistenceRequested:operationsRequestSave\(operations\)/,
  'Egg Shop persistence must project from owner operations',
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*true/,
  'Egg Shop adapter must not keep an independent persistence boolean truth',
);

console.log('egg shop owner-persistence smoke: ok');
