import assert from 'node:assert/strict';
import { renderStaticDexEntryModule } from '../scripts/showdown-static-dex-entry.mjs';
import { SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';

const rendered = renderStaticDexEntryModule({
  packaging: { revision: SHOWDOWN_REVISION },
  base: [
    { scope: 'base', file: 'moves.ts', absolute: '/pinned/data/moves.ts' },
    { scope: 'base', file: 'items.ts', absolute: '/pinned/data/items.ts' },
  ],
  mods: [
    { mod: 'gen9', modules: [{ scope: 'mod_gen9', file: 'scripts.ts', absolute: '/pinned/data/mods/gen9/scripts.ts' }] },
  ],
});

assert.match(rendered, /SHOWDOWN_STATIC_DEX_DATA/);
assert.match(rendered, new RegExp(SHOWDOWN_REVISION));
assert.match(rendered, /\/pinned\/data\/moves\.ts/);
assert.match(rendered, /\/pinned\/data\/mods\/gen9\/scripts\.ts/);
assert.match(rendered, /"gen9": Object\.freeze/);
assert.doesNotMatch(rendered, /import\(/);
assert.doesNotMatch(rendered, /node:fs|node:path/);
assert.throws(() => renderStaticDexEntryModule({}), /invalid/);

console.log('Showdown static Dex entry smoke passed');
