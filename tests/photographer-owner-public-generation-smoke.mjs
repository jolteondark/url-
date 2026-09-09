import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../runtime/safari-photographer-interaction.js', import.meta.url), 'utf8');

assert.match(html, /\.\/runtime\/safari-photographer-interaction\.js\?v=20260909-2357/);
assert.doesNotMatch(html, /\.\/runtime\/safari-photographer-interaction\.js\?v=20260903-2028/);
assert.match(runtime, /op:\s*['"]request_save['"]/);
assert.match(runtime, /persistenceRequested\(state\.last_operations\)/);
assert.match(runtime, /registerSafariNormalEventBattleContinuation\(['"]photographer['"]/);
assert.match(runtime, /commitSafariBagEconomyReceipt/);
assert.match(runtime, /optionalReward/);

console.log('photographer owner public generation smoke: ok');
