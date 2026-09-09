import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../runtime/safari-old-statue-interaction.js', import.meta.url), 'utf8');

assert.match(html, /\.\/runtime\/safari-old-statue-interaction\.js\?v=20260910-0258/);
assert.doesNotMatch(html, /\.\/runtime\/safari-old-statue-interaction\.js\?v=20260907-1430/);
assert.match(runtime, /op:\s*['"]request_save['"][\s\S]*old_statue_resolved/);
assert.match(runtime, /function\s+operationsRequestSave\(operations\s*=\s*\[\]\)/);
assert.match(runtime, /persistenceRequested:\s*operationsRequestSave\(state\.last_operations\)/);
assert.match(runtime, /old_statue_offer_owner_pending/);
assert.match(runtime, /old_statue_break_owner_pending/);
assert.match(runtime, /resolveOldStatue/);
assert.match(runtime, /resolveMaplessOldStatueOutcomeV108/);

console.log('old statue owner public generation smoke: ok');
