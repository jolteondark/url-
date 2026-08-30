import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge = fs.readFileSync(new URL('../canonical-battle-ui-bridge.js', import.meta.url), 'utf8');
const uiCss = fs.readFileSync(new URL('../canonical-battle-ui.css', import.meta.url), 'utf8');
const statusCss = fs.readFileSync(new URL('../canonical-battle-status.css', import.meta.url), 'utf8');
const resolver = fs.readFileSync(new URL('../runtime/canonical-battle-ui-sources.js', import.meta.url), 'utf8');

assert.match(bridge, /canonicalBattleUiCandidates/);
for (const name of [
  'databox_normal_foe.png',
  'databox_normal.png',
  'overlay_hp.png',
  'overlay_message.png',
  'overlay_fight.png',
  'types.png',
  'icon_statuses.png',
  'overlay_lv.png',
]) assert.match(bridge, new RegExp(name.replace('.', '\\.')));

assert.doesNotMatch(uiCss, /assets\/canonical-battle-ui\//);
assert.doesNotMatch(statusCss, /assets\/canonical-battle-ui\//);
assert.match(uiCss, /var\(--canonical-battle-types,none\)/);
assert.match(statusCss, /var\(--canonical-battle-status-icons,none\)/);
assert.match(resolver, /'types\.png'[\s\S]*reason: 'published_binary_mismatch'/);
assert.match(bridge, /if \(!candidate\)[\s\S]*removeProperty/);

console.log('battle-ui shared resolver smoke: PASS');
