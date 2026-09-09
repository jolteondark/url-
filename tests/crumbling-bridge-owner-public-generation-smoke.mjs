import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../runtime/safari-crumbling-bridge-interaction.js', import.meta.url), 'utf8');

assert.match(html, /\.\/runtime\/safari-crumbling-bridge-interaction\.js\?v=20260910-0158/);
assert.doesNotMatch(html, /\.\/runtime\/safari-crumbling-bridge-interaction\.js\?v=20260907-1230/);
assert.match(runtime, /op:\s*['"]request_save['"][\s\S]*crumbling_bridge_resolved/);
assert.match(runtime, /persistenceRequested:\s*state\.last_operations\.some\(\(operation\) => operation\?\.op === ['"]request_save['"]\)/);
assert.match(runtime, /resolveCrumblingBridge/);
assert.match(runtime, /finishPartyWipe/);
assert.match(runtime, /resolveRewardTransaction/);

console.log('crumbling bridge owner public generation smoke: ok');
