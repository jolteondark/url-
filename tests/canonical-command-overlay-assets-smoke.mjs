import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canonicalBattleUiCandidates } from '../runtime/canonical-battle-ui-sources.js';

const overlay = canonicalBattleUiCandidates('overlay_command.png');
assert.equal(overlay.length, 1);
assert.match(overlay[0], /^https:\/\/raw\.githubusercontent\.com\//);

const bridge = fs.readFileSync(new URL('../canonical-battle-ui-bridge.js', import.meta.url), 'utf8');
assert.match(bridge, /--canonical-battle-command-overlay["']?:\s*["']overlay_command\.png/);
assert.match(bridge, /new URL\(candidate, import\.meta\.url\)\.href/);

const css = fs.readFileSync(new URL('../canonical-battle-ui.css', import.meta.url), 'utf8');
assert.match(css, /background-image:var\(--canonical-battle-command-overlay,none\)!important/);
assert.match(css, /dppt-command-root::before\{content:none!important;display:none!important\}/);
assert.doesNotMatch(css, /content:"◉ ◉ ◉ ◉ ◉ ◉"/);

console.log('canonical command overlay assets smoke: PASS');
