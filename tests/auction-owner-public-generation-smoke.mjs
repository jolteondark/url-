import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../runtime/safari-auction-interaction.js', import.meta.url), 'utf8');

assert.match(
  html,
  /"\.\/runtime\/safari-auction-interaction\.js": "\.\/runtime\/safari-auction-interaction\.js\?v=20260910-2105"/,
  'reachable Safari auction owner must be delivered through a fresh import-map generation after #1460',
);
assert.doesNotMatch(
  html,
  /safari-auction-interaction\.js\?v=20260909-0400/,
  'do not keep the pre-#1460 Auction owner generation',
);
assert.match(
  source,
  /function requestsPersistence\(operations\)[\s\S]*?operation\?\.op === "request_save"/,
  'Auction persistence must remain projected from committed request_save operations',
);
assert.doesNotMatch(
  source,
  /persistenceRequested:true/,
  'Auction adapter must not reintroduce a second fixed persistence truth',
);

console.log('auction owner public generation smoke: ok');
