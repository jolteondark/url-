import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  PUBLISHED_CANONICAL_BATTLE_UI,
  canonicalBattleUiCandidates,
  canonicalBattleUiResolutionState,
} from '../runtime/canonical-battle-ui-sources.js';

const bridge = fs.readFileSync(new URL('../canonical-battle-ui-bridge.js', import.meta.url), 'utf8');
const uiCss = fs.readFileSync(new URL('../canonical-battle-ui.css', import.meta.url), 'utf8');
const statusCss = fs.readFileSync(new URL('../canonical-battle-status.css', import.meta.url), 'utf8');

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
assert.deepEqual(canonicalBattleUiCandidates('types.png'), ['assets/canonical-battle-ui/types.png']);
assert.equal(canonicalBattleUiResolutionState('types.png').status, 'eligible');
assert.equal(PUBLISHED_CANONICAL_BATTLE_UI['types.png'].canonicalGitBlobSha, '7f1b9d801436bbf1fc215aed24093292d3c0c8ba');
assert.equal(PUBLISHED_CANONICAL_BATTLE_UI['types.png'].canonicalSha256, '9dd259f26d6983ebe738b2a088941dce88f2acc63391dc8a3303190eea26f5ea');
assert.deepEqual(canonicalBattleUiCandidates('cursor_command.png'), []);
assert.equal(canonicalBattleUiResolutionState('cursor_command.png').status, 'blocked');
assert.match(bridge, /if \(!candidate\)[\s\S]*removeProperty/);

console.log('battle-ui shared resolver smoke: PASS');
