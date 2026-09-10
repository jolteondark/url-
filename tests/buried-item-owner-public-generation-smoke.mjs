import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../runtime/safari-buried-item-interaction.js', import.meta.url), 'utf8');

assert.match(
  html,
  /"\.\/runtime\/safari-buried-item-interaction\.js": "\.\/runtime\/safari-buried-item-interaction\.js\?v=20260910-1605"/,
  'reachable Safari Buried Item owner must be cache-busted after #1446',
);
assert.doesNotMatch(
  html,
  /safari-buried-item-interaction\.js\?v=20260906-1730/,
  'do not retain the pre-#1446 Buried Item generation',
);
assert.match(
  source,
  /\{ op: "request_save", source: "buried_item", index \}/,
  'resolved Buried Item routes should emit owner request_save',
);
assert.match(
  source,
  /persistenceRequested: operationsRequestSave\(state\.last_operations\)/,
  'Buried Item persistence must project from owner operations',
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*true/,
  'Buried Item adapter must not keep an independent persistence boolean truth',
);

console.log('buried item owner public generation smoke: ok');
