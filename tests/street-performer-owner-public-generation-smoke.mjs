import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(
  html,
  /"\.\/runtime\/safari-street-performer-interaction\.js": "\.\/runtime\/safari-street-performer-interaction\.js\?v=20260909-0830"/,
  'reachable Safari Street Performer owner must be delivered through the current public import-map generation after shared Battle-start persistence ownership convergence',
);
assert.doesNotMatch(
  html,
  /safari-street-performer-interaction\.js\?v=20260909-0600/,
  'do not reintroduce the pre-#1364 Street Performer owner generation',
);
assert.doesNotMatch(
  html,
  /safari-street-performer-interaction\.js\?v=20260904-1400/,
  'do not reintroduce the pre-Battle-start-persistence Street Performer owner generation',
);

console.log('street performer owner public generation smoke: ok');
