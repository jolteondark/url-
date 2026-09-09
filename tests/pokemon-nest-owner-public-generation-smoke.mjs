import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../runtime/safari-pokemon-nest-interaction.js', import.meta.url), 'utf8');

assert.match(html, /\.\/runtime\/safari-pokemon-nest-interaction\.js\?v=20260909-2300/);
assert.doesNotMatch(html, /\.\/runtime\/safari-pokemon-nest-interaction\.js\?v=20260904-2030/);
assert.match(runtime, /op:\s*['"]request_save['"]/);
assert.match(runtime, /persistenceRequested\(state\.last_operations\)/);
assert.match(runtime, /registerSafariNormalEventBattleContinuation\(['"]pokemon_nest['"]/);
assert.match(runtime, /commitSafariBagEconomyReceipt/);

console.log('pokemon nest owner public generation smoke: ok');
