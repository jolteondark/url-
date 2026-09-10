import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../runtime/safari-berry-contest-interaction.js', import.meta.url), 'utf8');

assert.ok(
  index.includes('./runtime/safari-berry-contest-interaction.js?v=20260910-2005'),
  'Berry Contest #1457 must be served from the refreshed public generation',
);
assert.ok(
  !index.includes('./runtime/safari-berry-contest-interaction.js?v=20260905-0800'),
  'Berry Contest stale public generation must not remain served',
);
assert.match(
  source,
  /persistenceRequested:state\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  'Berry Contest successful result must project persistence from committed request_save operations',
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*true/,
  'Berry Contest adapter must not regain an independent persistence boolean truth',
);

console.log('berry contest owner public generation smoke: ok');
