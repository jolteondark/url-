import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../runtime/safari-treasure-chest-interaction.js', import.meta.url), 'utf8');

assert.match(html, /\.\/runtime\/safari-treasure-chest-interaction\.js\?v=20260910-0057/);
assert.doesNotMatch(html, /\.\/runtime\/safari-treasure-chest-interaction\.js\?v=20260904-1200/);
assert.match(runtime, /op:\s*['"]request_save['"]/);
assert.match(runtime, /persistenceRequested\(state\.last_operations\)/);
assert.match(runtime, /resolveRewardTransaction/);
assert.match(runtime, /commitSafariBagEconomyReceipt/);
assert.match(runtime, /result:\s*['"]no_room['"]/);

console.log('treasure chest owner public generation smoke: ok');
