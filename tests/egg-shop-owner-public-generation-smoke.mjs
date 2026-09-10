import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../runtime/safari-egg-shop-interaction.js', import.meta.url), 'utf8');

assert.match(
  html,
  /"\.\/runtime\/safari-egg-shop-interaction\.js": "\.\/runtime\/safari-egg-shop-interaction\.js\?v=20260910-1635"/,
  'reachable Safari Egg Shop owner must be cache-busted after #1449',
);
assert.doesNotMatch(
  html,
  /safari-egg-shop-interaction\.js\?v=20260906-1730/,
  'do not retain the pre-#1449 Egg Shop generation',
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

console.log('egg shop owner public generation smoke: ok');
