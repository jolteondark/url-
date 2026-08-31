import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canonicalBattleUiCandidates } from '../runtime/canonical-battle-ui-sources.js';

const localCursor = canonicalBattleUiCandidates('cursor_command.png');
assert.equal(localCursor[0], 'assets/canonical-battle-ui/cursor_command.png');

const overlayCandidates = canonicalBattleUiCandidates('overlay_command.png');
assert.equal(overlayCandidates.length, 1);
assert.match(overlayCandidates[0], /^https:\/\/raw\.githubusercontent\.com\//);
assert.doesNotMatch(overlayCandidates[0], /^assets\//);

const bridge = fs.readFileSync(new URL('../canonical-battle-ui-bridge.js', import.meta.url), 'utf8');
assert.match(bridge, /--canonical-battle-command-cursor["']?:\s*["']cursor_command\.png/);
assert.match(bridge, /new URL\(candidate, import\.meta\.url\)\.href/);

const css = fs.readFileSync(new URL('../canonical-battle-ui.css', import.meta.url), 'utf8');
assert.match(css, /background-image:var\(--canonical-battle-command-cursor,none\)!important/);
assert.match(css, /background-size:200% 1000%!important/);
assert.match(css, /data-dppt-command="fight"\]\{--canonical-command-row:0/);
assert.match(css, /data-dppt-command="bag"\]\{--canonical-command-row:2/);
assert.match(css, /data-dppt-command="party"\]\{--canonical-command-row:1/);
assert.match(css, /data-dppt-command="flee"\]\{--canonical-command-row:3/);
assert.match(css, /background-position:100% calc\(var\(--canonical-command-row\) \* 11\.111111%\)!important/);

console.log('canonical command menu assets smoke: PASS');
