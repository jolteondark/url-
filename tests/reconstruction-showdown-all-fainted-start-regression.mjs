import assert from 'node:assert/strict';
import { preservePersistentLiveCountDuringStart, runAuthoritativeStartWithPersistentLiveCounts } from '../src-next/core/battle/showdown-start-livecount-guard.js';

function side(hps) {
  return {
    pokemon: hps.map((hp) => ({ hp, fainted: hp === 0 })),
    pokemonLeft: hps.filter((hp) => hp > 0).length,
  };
}

const allFainted = side([0, 0]);
const descriptorBefore = Object.getOwnPropertyDescriptor(allFainted, 'pokemonLeft');
assert.throws(
  () => preservePersistentLiveCountDuringStart(allFainted),
  /requires at least one non-fainted Pokemon per side/,
  'a new Showdown battle must not resurrect or activate an all-fainted persistent side',
);
assert.deepEqual(
  Object.getOwnPropertyDescriptor(allFainted, 'pokemonLeft'),
  descriptorBefore,
  'all-fainted rejection must occur before installing the start-scoped accessor',
);

const healthyP1 = side([35]);
const allFaintedP2 = side([0, 0]);
let startCalls = 0;
assert.throws(
  () => runAuthoritativeStartWithPersistentLiveCounts(
    { sides: [healthyP1, allFaintedP2] },
    () => { startCalls += 1; },
  ),
  /requires at least one non-fainted Pokemon per side/,
  'battle-scoped preflight must reject if either hydrated side has no legal live Pokemon',
);
assert.equal(startCalls, 0, 'authoritative Battle#start must not run after an all-fainted projection failure');
assert.equal(healthyP1.pokemonLeft, 1, 'a previously guarded healthy side must be restored after the opposite side fails preflight');
const restored = Object.getOwnPropertyDescriptor(healthyP1, 'pokemonLeft');
assert.equal(typeof restored.get, 'undefined', 'partial guard installation must not leak an accessor');
assert.equal(typeof restored.set, 'undefined', 'partial guard installation must restore ordinary data-property semantics');
assert.equal(restored.writable, true, 'restored pokemonLeft must remain writable');

console.log('reconstruction showdown all-fainted start regression: ok');
