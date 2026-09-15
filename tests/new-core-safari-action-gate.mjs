import assert from 'node:assert/strict';
import {
  beginSafariAction,
  cancelSafariAction,
  createSafariActionGate,
  releaseSafariAction,
  snapshotSafariActionGate,
} from '../src-next/platform/safari-action-gate.js';

const gate = createSafariActionGate();
const first = beginSafariAction(gate, { type: 'FIGHT', move: 'TACKLE' });
assert.equal(first.action.type, 'FIGHT');
assert.equal(beginSafariAction(gate, { type: 'FIGHT', move: 'TACKLE' }), null, 'double tap must not submit twice');
assert.deepEqual(snapshotSafariActionGate(gate), {
  activeSequence: 0,
  activeType: 'FIGHT',
  accepted: 1,
  rejected: 1,
});

assert.equal(releaseSafariAction(gate, { sequence: 999 }), false, 'stale result cannot unlock a newer action');
assert.equal(releaseSafariAction(gate, first.token), true);
assert.equal(releaseSafariAction(gate, first.token), false, 'release is exactly once');

const second = beginSafariAction(gate, { type: 'BAG', item: 'POTION' });
assert.equal(second.token.sequence, 1);
assert.equal(cancelSafariAction(gate, second.token), true, 'navigation/teardown can cancel input ownership');
const third = beginSafariAction(gate, { type: 'RUN' });
assert.equal(third.token.sequence, 2, 'tokens remain monotonic across cancellation');
assert.deepEqual(snapshotSafariActionGate(gate), {
  activeSequence: 2,
  activeType: 'RUN',
  accepted: 3,
  rejected: 1,
});

assert.throws(() => beginSafariAction(gate, null), /object with type/);
console.log('new-core Safari action gate: ok');
