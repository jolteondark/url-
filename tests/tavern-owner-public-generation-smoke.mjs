import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../runtime/safari-tavern-interaction.js', import.meta.url), 'utf8');

assert.match(html, /\.\/runtime\/safari-tavern-interaction\.js\?v=20260910-0758/);
assert.doesNotMatch(html, /\.\/runtime\/safari-tavern-interaction\.js\?v=20260905-0000/);
assert.match(runtime, /function operationsRequestSave\(operations = \[\]\)/);
assert.match(runtime, /persistenceRequested:operationsRequestSave\(state\.last_operations\)/);
assert.doesNotMatch(runtime, /persistenceRequested:true/);
assert.match(runtime, /\{ op:"request_save", reason:"tavern_rest" \}/);
assert.match(runtime, /commitSafariBagEconomyReceipt/);
assert.match(runtime, /healSafariPartyPercent\(runtime, 50, \{ cureStatus:true \}\)/);

console.log('tavern owner public generation smoke: ok');
