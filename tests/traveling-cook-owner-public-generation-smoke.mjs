import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../runtime/safari-traveling-cook-interaction.js', import.meta.url), 'utf8');
const baseSource = readFileSync(new URL('../runtime/safari-traveling-cook-interaction-base.js', import.meta.url), 'utf8');

assert.match(
  html,
  /"\.\/runtime\/safari-traveling-cook-interaction\.js": "\.\/runtime\/safari-traveling-cook-interaction\.js\?v=20260910-1235"/,
  'reachable Safari Traveling Cook wrapper must retain its current public import-map generation',
);
assert.match(
  html,
  /"\.\/runtime\/safari-traveling-cook-interaction-base\.js": "\.\/runtime\/safari-traveling-cook-interaction-base\.js\?v=20260910-1400"/,
  'nested Traveling Cook base owner must be cache-busted after #1443',
);
assert.doesNotMatch(
  html,
  /safari-traveling-cook-interaction-base\.js\?v=20260906-1730/,
  'do not retain a pre-#1443 Traveling Cook base generation',
);
assert.match(source, /\{ op:"request_save", reason:"traveling_cook_power_meal_resolved" \}/, 'resolved power-meal routes should emit request_save');
assert.doesNotMatch(source, /persistenceRequested:true/, 'Traveling Cook power-meal adapter must not keep an independent persistence boolean truth');
assert.match(baseSource, /ensureResolvedSave\(state, "traveling_cook_prototype_resolved"\)/, 'resolved prototype routes should emit request_save');
assert.match(baseSource, /if \(owner\.result\) ensureResolvedSave\(state, "traveling_cook_resolved"\)/, 'resolved base routes should emit request_save');
assert.match(baseSource, /persistenceRequested: operationsRequestSave\(state\.last_operations\)/, 'base persistence should project from owner operations');
assert.doesNotMatch(baseSource, /persistenceRequested:true/, 'Traveling Cook base adapter must not keep an independent persistence boolean truth');

console.log('traveling cook owner public generation smoke: ok');
