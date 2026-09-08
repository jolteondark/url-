import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(
  html,
  /"\.\/runtime\/safari-village-fixed-shop-integration\.js": "\.\/runtime\/safari-village-fixed-shop-integration\.js\?v=20260909-0300"/,
  'reachable Safari village fixed-shop module must be cache-busted after resolved shop owner persistence change',
);
assert.match(
  html,
  /"\.\/runtime\/bag-economy-resolved-shop-transaction\.js": "\.\/runtime\/bag-economy-resolved-shop-transaction\.js\?v=20260909-0300"/,
  'resolved shop transaction owner must be delivered through a fresh Safari import-map generation',
);
assert.doesNotMatch(
  html,
  /safari-village-fixed-shop-integration\.js\?v=2026090[0-8]-/,
  'do not reintroduce a pre-owner-change fixed-shop Safari generation',
);

console.log('resolved shop owner public generation smoke: ok');
