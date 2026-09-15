import assert from 'node:assert/strict';
import {
  createPresentationQueue,
  enqueuePresentationEvents,
  snapshotPresentationQueue,
} from '../src-next/presentation/semantic-event-queue.js';
import {
  beginNextPresentationJob,
  completePresentationJob,
  createPresentationJobDriver,
  snapshotPresentationJobDriver,
} from '../src-next/presentation/semantic-job-driver.js';

const queue = createPresentationQueue();
enqueuePresentationEvents(queue, [
  { type: 'MOVE_USED', move: 'TACKLE' },
  { type: 'DAMAGE_APPLIED', hp: 12 },
]);

const driver = createPresentationJobDriver(queue);
const first = beginNextPresentationJob(driver);
assert.equal(first.job.event.type, 'MOVE_USED');
assert.equal(beginNextPresentationJob(driver), null, 'active animation/message must block a second dequeue');
assert.equal(snapshotPresentationJobDriver(driver).pending, 1);
assert.equal(snapshotPresentationQueue(queue).shifted, 1);

assert.equal(completePresentationJob(driver, { sequence: 999 }), false, 'stale/wrong completion cannot advance presentation');
assert.equal(snapshotPresentationJobDriver(driver).activeType, 'MOVE_USED');
assert.equal(completePresentationJob(driver, first.token), true);
assert.equal(completePresentationJob(driver, first.token), false, 'completion is exactly once');

const second = beginNextPresentationJob(driver);
assert.equal(second.job.event.type, 'DAMAGE_APPLIED');
assert.equal(completePresentationJob(driver, second.token), true);
assert.equal(beginNextPresentationJob(driver), null);
assert.deepEqual(snapshotPresentationJobDriver(driver), {
  activeSequence: null,
  activeType: null,
  completed: 2,
  pending: 0,
});

console.log('new-core presentation job driver: ok');
