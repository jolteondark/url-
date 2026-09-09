import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../runtime/safari-sleeping-giant-interaction.js', import.meta.url), 'utf8');

assert.match(html, /\.\/runtime\/safari-sleeping-giant-interaction\.js\?v=20260909-2200/);
assert.doesNotMatch(html, /\.\/runtime\/safari-sleeping-giant-interaction\.js\?v=20260903-2310/);
assert.match(runtime, /op:\s*['"]request_save['"]/);
assert.match(runtime, /persistenceRequested\(state\.last_operations\)/);
assert.match(runtime, /registerSafariNormalEventBattleContinuation\(['"]sleeping_giant['"]/);
assert.match(runtime, /commitSafariBagEconomyReceipt/);

console.log('sleeping giant owner public generation smoke: ok');
