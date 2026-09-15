import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../scripts/prepare-pinned-showdown-extractor.mjs', import.meta.url), 'utf8');
assert.match(source, /PKMN_PS_REVISION/, 'extractor checkout must remain pinned');
assert.match(source, /SHOWDOWN_REVISION/, 'Showdown mechanics checkout must use the Mapless pin');
assert.match(source, /fetch.*--depth=1.*SHOWDOWN_REVISION/s, 'preparation must fetch only the exact Showdown pin');
assert.match(source, /checkout.*--detach.*SHOWDOWN_REVISION/s, 'vendor must detach at the exact Showdown pin');
assert.match(source, /createBrowserExtractionPlan\(root\)/, 'prepared vendor must pass the fail-closed extraction plan');
assert.doesNotMatch(source, /checkout[^\n]*(master|main)/, 'preparation must never float the Showdown vendor branch');
console.log('reconstruction Showdown pinned extractor prep: ok');
