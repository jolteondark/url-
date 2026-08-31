import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canonicalBattleUiCandidates } from '../runtime/canonical-battle-ui-sources.js';

const cursor = canonicalBattleUiCandidates('cursor_fight.png');
assert.equal(cursor.length, 1);
assert.match(cursor[0], /^https:\/\/raw\.githubusercontent\.com\//);

const bridge = fs.readFileSync(new URL('../canonical-battle-ui-bridge.js', import.meta.url), 'utf8');
assert.match(bridge, /--canonical-battle-fight-cursor["']?:\s*["']cursor_fight\.png/);
assert.match(bridge, /--canonical-fight-row/);
assert.match(bridge, /TYPE_ICON_ROWS\[candidateType\]/);

const css = fs.readFileSync(new URL('../canonical-battle-ui.css', import.meta.url), 'utf8');
assert.match(css, /background-image:var\(--canonical-battle-fight-cursor,none\)!important/);
assert.match(css, /background-size:200% 1900%!important/);
assert.match(css, /background-position:100% calc\(var\(--canonical-fight-row\) \* 5\.5555556%\)!important/);
assert.doesNotMatch(css, /outline:2px solid rgba\(246,213,78/);

console.log('canonical fight cursor assets smoke: PASS');
