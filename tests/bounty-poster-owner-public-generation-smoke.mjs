import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../runtime/safari-bounty-poster-interaction.js', import.meta.url), 'utf8');

assert.match(html, /\.\/runtime\/safari-bounty-poster-interaction\.js\?v=20260910-0558/);
assert.doesNotMatch(html, /\.\/runtime\/safari-bounty-poster-interaction\.js\?v=20260908-1230/);
assert.match(runtime, /op:\s*['"]request_save['"]/);
assert.match(runtime, /persistenceRequested:operationsRequestSave\(state\.last_operations\)/);
assert.match(runtime, /resolveCanonicalNormalEvent\(['"]bounty_poster['"]/);
assert.match(runtime, /operation\?\.op === ['"]set_bounty['"]/);
assert.match(runtime, /state\.board_consumed\[index\] = Boolean\(owner\.event\?\.normal_resolved\)/);

console.log('bounty poster owner public generation smoke: ok');
