import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(
  html,
  /"\.\/runtime\/safari-auction-interaction\.js": "\.\/runtime\/safari-auction-interaction\.js\?v=20260909-0400"/,
  'reachable Safari auction owner must be delivered through a fresh import-map generation after resumable-progress persistence change',
);
assert.doesNotMatch(
  html,
  /safari-auction-interaction\.js\?v=20260903-1200/,
  'do not reintroduce the pre-persistence auction owner generation',
);

console.log('auction owner public generation smoke: ok');
