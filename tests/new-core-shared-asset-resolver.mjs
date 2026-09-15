import assert from 'node:assert/strict';
import { createSharedAssetResolver } from '../src-next/presentation/shared-asset-resolver.js';

const resolver = createSharedAssetResolver({
  basePath: '/url-',
  manifest: {
    'battle.player.front': 'assets/ui/battle/player-front.png',
    'pokemon.025.front': 'assets/pokemon/front/025.png',
  },
});

assert.deepEqual(resolver.resolve('pokemon.025.front'), {
  identifier: 'pokemon.025.front',
  path: 'assets/pokemon/front/025.png',
  url: '/url-/assets/pokemon/front/025.png',
});
assert.equal(resolver.resolve('pokemon.999.front'), null);
assert.deepEqual(resolver.snapshot(), { entries: 2, resolves: 2, hits: 1, misses: 1 });

assert.throws(() => createSharedAssetResolver({ manifest: { bad: '../secret.png' } }), /unsafe asset path/);
assert.throws(() => resolver.resolve('../bad'), /unsafe asset identifier/);

const rootResolver = createSharedAssetResolver({ manifest: { icon: 'assets/icon.png' } });
assert.equal(rootResolver.resolve('icon').url, 'assets/icon.png');

console.log('new-core shared asset resolver: ok');
