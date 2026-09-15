import assert from 'node:assert/strict';
import {
  createPresentationQueue,
  discardPendingPresentationJobs,
  enqueuePresentationEvents,
  shiftPresentationJob,
  snapshotPresentationQueue,
} from '../src-next/presentation/semantic-event-queue.js';

const queue = createPresentationQueue();
const domainEvents = [
  { type: 'BATTLE_STARTED', battleId: 'fixture:1' },
  { type: 'POKEMON_SENT_OUT', side: 'player', species: 'PIKACHU' },
  { type: 'MOVE_USED', side: 'player', move: 'THUNDERBOLT' },
  { type: 'DAMAGE_APPLIED', side: 'foe', hpBefore: 100, hpAfter: 42 },
  { type: 'BATTLE_WON', battleId: 'fixture:1' },
];
const original = structuredClone(domainEvents);

enqueuePresentationEvents(queue, domainEvents);
assert.deepEqual(domainEvents, original, 'presentation enqueue must not mutate domain events');
assert.deepEqual(snapshotPresentationQueue(queue), {
  pending: 5,
  nextSequence: 5,
  enqueued: 5,
  shifted: 0,
  discarded: 0,
  peakPending: 5,
  jobs: [
    { sequence: 0, type: 'BATTLE_STARTED', message: false, animation: true },
    { sequence: 1, type: 'POKEMON_SENT_OUT', message: false, animation: true },
    { sequence: 2, type: 'MOVE_USED', message: true, animation: true },
    { sequence: 3, type: 'DAMAGE_APPLIED', message: true, animation: true },
    { sequence: 4, type: 'BATTLE_WON', message: true, animation: true },
  ],
});

const first = shiftPresentationJob(queue);
assert.equal(first.sequence, 0);
assert.equal(first.event.type, 'BATTLE_STARTED');
assert.equal(snapshotPresentationQueue(queue).pending, 4);
assert.equal(snapshotPresentationQueue(queue).shifted, 1);

const unknown = { type: 'BOARD_READY', day: 1 };
enqueuePresentationEvents(queue, [unknown]);
unknown.day = 99;
const snapshot = snapshotPresentationQueue(queue);
assert.equal(snapshot.enqueued, 6);
assert.equal(snapshot.shifted, 1);
assert.equal(snapshot.discarded, 0);
assert.equal(snapshot.peakPending, 5, 'peak queue pressure must remain observable after draining');
assert.deepEqual(snapshot.jobs.at(-1), {
  sequence: 5,
  type: 'BOARD_READY',
  message: false,
  animation: false,
});

const discarded = discardPendingPresentationJobs(queue);
assert.equal(discarded, 5, 'scene teardown can drop all stale presentation-only work at once');
const afterDiscard = snapshotPresentationQueue(queue);
assert.equal(afterDiscard.pending, 0);
assert.equal(afterDiscard.discarded, 5);
assert.equal(afterDiscard.shifted, 1, 'discard is not presentation completion/dequeue');
assert.equal(afterDiscard.nextSequence, 6, 'sequence remains monotonic across scene teardown');
assert.equal(discardPendingPresentationJobs(queue), 0, 'repeated teardown is idempotent when no work remains');

enqueuePresentationEvents(queue, [{ type: 'BATTLE_STARTED', battleId: 'fixture:2' }]);
const nextScene = shiftPresentationJob(queue);
assert.equal(nextScene.sequence, 6, 'new scene work cannot collide with discarded job tokens');
assert.equal(nextScene.event.battleId, 'fixture:2');
assert.equal(snapshotPresentationQueue(queue).discarded, 5);

console.log('new-core presentation event queue: ok');
