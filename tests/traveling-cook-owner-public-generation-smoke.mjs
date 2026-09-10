import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../runtime/safari-traveling-cook-interaction.js', import.meta.url), 'utf8');

assert.match(
  html,
  /"\.\/runtime\/safari-traveling-cook-interaction\.js": "\.\/runtime\/safari-traveling-cook-interaction\.js\?v=20260910-1235"/,
  'reachable Safari Traveling Cook owner must be delivered through the current public import-map generation after owner persistence convergence',
);
assert.doesNotMatch(
  html,
  /safari-traveling-cook-interaction\.js\?v=20260906-1730/,
  'do not retain the pre-#1441 Traveling Cook owner generation',
);
assert.match(source, /\{ op:"request_save", reason:"traveling_cook_power_meal_resolved" \}/, 'resolved power-meal routes should emit request_save');
assert.doesNotMatch(source, /persistenceRequested:true/, 'Traveling Cook power-meal adapter must not keep an independent persistence boolean truth');

console.log('traveling cook owner public generation smoke: ok');
