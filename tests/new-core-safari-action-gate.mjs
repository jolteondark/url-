import assert from 'node:assert/strict';
import {
  beginSafariAction,
  cancelSafariAction,
  createSafariActionGate,
  releaseSafariAction,
  snapshotSafariActionGate,
} from '../src-next/platform/safari-action-gate.js';

let nowMs = 100;
const gate = createSafariActionGate({ now: () => nowMs, slowActionThresholdMs: 20 });
const first = beginSafariAction(gate, { type: 'FIGHT', move: 'TACKLE' });
assert.equal(first.action.type, 'FIGHT');
nowMs = 112;
assert.equal(beginSafariAction(gate, { type: 'FIGHT', move: 'TACKLE' }), null, 'double tap must not submit twice');
assert.deepEqual(snapshotSafariActionGate(gate), {
  activeSequence: 0,
  activeType: 'FIGHT',
  activeDurationMs: 12,
  activeSlow: false,
  accepted: 1,
  rejected: 1,
  completed: 0,
  cancelled: 0,
  slowCompleted: 0,
  slowActionThresholdMs: 20,
  lastDurationMs: null,
  maxDurationMs: 0,
  averageDurationMs: null,
  byType: {
    FIGHT: {
      accepted: 1,
      rejected: 1,
      completed: 0,
      cancelled: 0,
      slowCompleted: 0,
      lastDurationMs: null,
      maxDurationMs: 0,
      averageDurationMs: null,
    },
  },
});

nowMs = 121;
assert.equal(snapshotSafariActionGate(gate).activeSlow, true, 'active action crossing the diagnostic budget is visible');
assert.equal(releaseSafariAction(gate, { sequence: 999 }), false, 'stale result cannot unlock a newer action');
nowMs = 125;
assert.equal(releaseSafariAction(gate, first.token), true);
assert.equal(releaseSafariAction(gate, first.token), false, 'release is exactly once');
assert.equal(snapshotSafariActionGate(gate).lastDurationMs, 25);
assert.equal(snapshotSafariActionGate(gate).slowCompleted, 1);

const second = beginSafariAction(gate, { type: 'BAG', item: 'POTION' });
assert.equal(second.token.sequence, 1);
nowMs = 165;
assert.equal(cancelSafariAction(gate, second.token), true, 'navigation/teardown can cancel input ownership');
const third = beginSafariAction(gate, { type: 'RUN' });
assert.equal(third.token.sequence, 2, 'tokens remain monotonic across cancellation');
nowMs = 180;
assert.equal(releaseSafariAction(gate, third.token), true);
assert.deepEqual(snapshotSafariActionGate(gate), {
  activeSequence: null,
  activeType: null,
  activeDurationMs: null,
  activeSlow: false,
  accepted: 3,
  rejected: 1,
  completed: 2,
  cancelled: 1,
  slowCompleted: 1,
  slowActionThresholdMs: 20,
  lastDurationMs: 15,
  maxDurationMs: 25,
  averageDurationMs: 20,
  byType: {
    FIGHT: {
      accepted: 1,
      rejected: 1,
      completed: 1,
      cancelled: 0,
      slowCompleted: 1,
      lastDurationMs: 25,
      maxDurationMs: 25,
      averageDurationMs: 25,
    },
    BAG: {
      accepted: 1,
      rejected: 0,
      completed: 0,
      cancelled: 1,
      slowCompleted: 0,
      lastDurationMs: null,
      maxDurationMs: 0,
      averageDurationMs: null,
    },
    RUN: {
      accepted: 1,
      rejected: 0,
      completed: 1,
      cancelled: 0,
      slowCompleted: 0,
      lastDurationMs: 15,
      maxDurationMs: 15,
      averageDurationMs: 15,
    },
  },
});

const noBudgetGate = createSafariActionGate({ now: () => nowMs });
const noBudgetAction = beginSafariAction(noBudgetGate, { type: 'POKEMON' });
nowMs += 1000;
assert.equal(releaseSafariAction(noBudgetGate, noBudgetAction.token), true);
assert.equal(snapshotSafariActionGate(noBudgetGate).slowCompleted, 0, 'slow classification is opt-in until physical Safari supplies a budget');

assert.throws(() => beginSafariAction(gate, null), /object with type/);
assert.throws(() => createSafariActionGate({ now: 1 }), /clock must be a function/);
assert.throws(() => createSafariActionGate({ slowActionThresholdMs: -1 }), /threshold/);
console.log('new-core Safari action gate: ok');
