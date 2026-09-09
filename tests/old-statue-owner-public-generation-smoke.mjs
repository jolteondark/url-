import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../runtime/safari-old-statue-interaction.js', import.meta.url), 'utf8');

assert.match(html, /\.\/runtime\/safari-old-statue-interaction\.js\?v=20260910-0405/);
assert.doesNotMatch(html, /\.\/runtime\/safari-old-statue-interaction\.js\?v=20260910-0258/);
assert.match(runtime, /op:\s*['"]request_save['"][\s\S]*old_statue_resolved/);
assert.match(runtime, /function\s+operationsRequestSave\(operations\s*=\s*\[\]\)/);
assert.match(runtime, /persistenceRequested:\s*operationsRequestSave\(state\.last_operations\)/);
assert.match(runtime, /old_statue_offer_owner_pending/);
assert.match(runtime, /old_statue_break_reward_owner_pending/);
assert.match(runtime, /action === "break"[\s\S]*break_roll[\s\S]*roll < 95[\s\S]*resolveOldStatue\(\{ event, choice:"break" \}\)[\s\S]*applyPartyDamage\(runtime, 15\)/);
assert.match(runtime, /function finishPartyWipe[\s\S]*maplessPartyAllFainted[\s\S]*finishMaplessRun[\s\S]*normal_event:old_statue/);
assert.match(runtime, /resolveMaplessOldStatueOutcomeV108/);

console.log('old statue owner public generation smoke: ok');
