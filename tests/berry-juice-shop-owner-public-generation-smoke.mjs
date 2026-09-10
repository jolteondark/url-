import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../runtime/safari-berry-juice-shop-interaction.js', import.meta.url), 'utf8');

assert.match(
  html,
  /"\.\/runtime\/safari-berry-juice-shop-interaction\.js": "\.\/runtime\/safari-berry-juice-shop-interaction\.js\?v=20260910-2200"/,
  'Berry Juice Shop owner convergence must be delivered through a fresh Safari import-map generation',
);
assert.doesNotMatch(
  html,
  /safari-berry-juice-shop-interaction\.js\?v=20260908-0330/,
  'do not keep the pre-convergence Berry Juice Shop generation',
);
assert.match(
  source,
  /persistenceRequested:state\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  'successful Berry Juice Shop transactions must project persistence from committed request_save operations',
);
assert.match(
  source,
  /persistenceRequested:committed\.last_operations\.some\(\(operation\) => operation\?\.op === "request_save"\)/,
  'Berry Juice Shop leave must project persistence from committed request_save operations',
);
assert.doesNotMatch(
  source,
  /persistenceRequested:\s*true/,
  'Berry Juice Shop adapter must not reintroduce an independent persistence boolean truth',
);

console.log('berry juice shop owner public generation smoke: ok');
