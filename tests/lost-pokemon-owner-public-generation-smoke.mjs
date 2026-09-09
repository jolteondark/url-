import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../runtime/safari-lost-pokemon-interaction.js', import.meta.url), 'utf8');

assert.match(html, /\.\/runtime\/safari-lost-pokemon-interaction\.js\?v=20260909-2100/);
assert.doesNotMatch(html, /\.\/runtime\/safari-lost-pokemon-interaction\.js\?v=20260904-2200/);
assert.match(runtime, /op:\s*['"]request_save['"]/);
assert.match(runtime, /persistenceRequested\(state\.last_operations\)/);

console.log('lost pokemon owner public generation smoke: ok');
