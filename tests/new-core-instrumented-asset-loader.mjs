import assert from 'node:assert/strict';
import { createSharedAssetResolver } from '../src-next/presentation/shared-asset-resolver.js';
import { createInstrumentedAssetLoader } from '../src-next/platform/instrumented-asset-loader.js';

const resolver = createSharedAssetResolver({
  basePath: '/url-',
  manifest: { PLAYER: 'assets/canonical-battle-sprites/back/CHARMANDER.png' },
});

let now = 0;
let loads = 0;
let decodes = 0;
const loader = createInstrumentedAssetLoader({
  resolver,
  clock: () => now,
  load: async (url) => {
    loads += 1;
    assert.equal(url, '/url-/assets/canonical-battle-sprites/back/CHARMANDER.png');
    now += 7;
    return { url };
  },
  decode: async () => {
    decodes += 1;
    now += 3;
  },
});

const first = await loader.loadAsset('PLAYER');
const second = await loader.loadAsset('PLAYER');
assert.equal(first, second, 'cache should reuse the same resolved promise result');
assert.equal(loads, 1);
assert.equal(decodes, 1);
assert.deepEqual(loader.snapshot(), {
  requests: 2,
  cacheEntries: 1,
  cacheHits: 1,
  cacheMisses: 1,
  loadFailures: 0,
  decodeFailures: 0,
  averageLoadMs: 7,
  maxLoadMs: 7,
  averageDecodeMs: 3,
  maxDecodeMs: 3,
});

assert.equal(await loader.loadAsset('MISSING'), null);
assert.equal(loader.snapshot().requests, 3);

let attempts = 0;
const retryLoader = createInstrumentedAssetLoader({
  resolver,
  load: async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('network');
    return {};
  },
});
await assert.rejects(() => retryLoader.loadAsset('PLAYER'), /network/);
await retryLoader.loadAsset('PLAYER');
assert.equal(attempts, 2, 'failed loads must not poison the cache');
assert.equal(retryLoader.snapshot().loadFailures, 1);

console.log('new-core instrumented asset loader smoke: ok');
