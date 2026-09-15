import assert from 'node:assert/strict';
import {
  createPresentationQueue,
  enqueuePresentationEvents,
  snapshotPresentationQueue,
} from '../src-next/presentation/semantic-event-queue.js';
import {
  beginNextPresentationJob,
  cancelPresentationJob,
  completePresentationJob,
  createPresentationJobDriver,
  snapshotPresentationJobDriver,
} from '../src-next/presentation/semantic-job-driver.js';

const queue = createPresentationQueue();
enqueuePresentationEvents(queue, [
  { type: 'MOVE_USED', move: 'TACKLE' },
  { type: 'DAMAGE_APPLIED', hp: 12 },
]);

let clockMs = 100;
const driver = createPresentationJobDriver(queue, { now: () => clockMs });
const first = beginNextPresentationJob(driver);
assert.equal(first.job.event.type, 'MOVE_USED');
assert.equal(beginNextPresentationJob(driver), null, 'active animation/message must block a second dequeue');
clockMs = 112;
assert.equal(snapshotPresentationJobDriver(driver).pending, 1);
assert.equal(snapshotPresentationJobDriver(driver).activeDurationMs, 12);
assert.equal(snapshotPresentationQueue(queue).shifted, 1);

assert.equal(completePresentationJob(driver, { sequence: 999 }), false, 'stale/wrong completion cannot advance presentation');
assert.equal(snapshotPresentationJobDriver(driver).activeType, 'MOVE_USED');
clockMs = 125;
assert.equal(completePresentationJob(driver, first.token), true);
assert.equal(completePresentationJob(driver, first.token), false, 'completion is exactly once');

clockMs = 200;
const second = beginNextPresentationJob(driver);
assert.equal(second.job.event.type, 'DAMAGE_APPLIED');
clockMs = 215;
assert.equal(completePresentationJob(driver, second.token), true);
assert.equal(beginNextPresentationJob(driver), null);
assert.deepEqual(snapshotPresentationJobDriver(driver), {
  activeSequence: null,
  activeType: null,
  activeDurationMs: null,
  activeSlow: false,
  completed: 2,
  cancelled: 0,
  pending: 0,
  slowJobThresholdMs: null,
  slowCompleted: 0,
  lastDurationMs: 15,
  maxDurationMs: 25,
  averageDurationMs: 20,
  byType: {
    MOVE_USED: {
      completed: 1,
      slowCompleted: 0,
      lastDurationMs: 25,
      maxDurationMs: 25,
      averageDurationMs: 25,
    },
    DAMAGE_APPLIED: {
      completed: 1,
      slowCompleted: 0,
      lastDurationMs: 15,
      maxDurationMs: 15,
      averageDurationMs: 15,
    },
  },
});

const repeatedQueue = createPresentationQueue();
enqueuePresentationEvents(repeatedQueue, [
  { type: 'MOVE_USED', move: 'EMBER' },
  { type: 'MOVE_USED', move: 'EMBER' },
]);
let repeatedClockMs = 0;
const repeatedDriver = createPresentationJobDriver(repeatedQueue, { now: () => repeatedClockMs });
const repeatedFirst = beginNextPresentationJob(repeatedDriver);
repeatedClockMs = 10;
assert.equal(completePresentationJob(repeatedDriver, repeatedFirst.token), true);
const repeatedSecond = beginNextPresentationJob(repeatedDriver);
repeatedClockMs = 40;
assert.equal(completePresentationJob(repeatedDriver, repeatedSecond.token), true);
assert.deepEqual(snapshotPresentationJobDriver(repeatedDriver).byType.MOVE_USED, {
  completed: 2,
  slowCompleted: 0,
  lastDurationMs: 30,
  maxDurationMs: 30,
  averageDurationMs: 20,
});

const budgetQueue = createPresentationQueue();
enqueuePresentationEvents(budgetQueue, [
  { type: 'MOVE_USED', move: 'SURF' },
  { type: 'DAMAGE_APPLIED', hp: 1 },
]);
let budgetClockMs = 0;
const budgetDriver = createPresentationJobDriver(budgetQueue, {
  now: () => budgetClockMs,
  slowJobThresholdMs: 20,
});
const budgetFirst = beginNextPresentationJob(budgetDriver);
budgetClockMs = 20;
assert.equal(snapshotPresentationJobDriver(budgetDriver).activeSlow, true);
assert.equal(completePresentationJob(budgetDriver, budgetFirst.token), true);
const budgetSecond = beginNextPresentationJob(budgetDriver);
budgetClockMs = 25;
assert.equal(completePresentationJob(budgetDriver, budgetSecond.token), true);
const budgetSnapshot = snapshotPresentationJobDriver(budgetDriver);
assert.equal(budgetSnapshot.slowJobThresholdMs, 20);
assert.equal(budgetSnapshot.slowCompleted, 1);
assert.equal(budgetSnapshot.byType.MOVE_USED.slowCompleted, 1);
assert.equal(budgetSnapshot.byType.DAMAGE_APPLIED.slowCompleted, 0);
assert.throws(
  () => createPresentationJobDriver(createPresentationQueue(), { slowJobThresholdMs: -1 }),
  /non-negative finite number/
);

const teardownQueue = createPresentationQueue();
enqueuePresentationEvents(teardownQueue, [
  { type: 'MOVE_USED', move: 'FLY' },
  { type: 'DAMAGE_APPLIED', hp: 2 },
]);
let teardownClockMs = 0;
const teardownDriver = createPresentationJobDriver(teardownQueue, { now: () => teardownClockMs });
const abandoned = beginNextPresentationJob(teardownDriver);
teardownClockMs = 500;
assert.equal(cancelPresentationJob(teardownDriver, { sequence: 999 }), false, 'wrong teardown token cannot cancel active presentation');
assert.equal(cancelPresentationJob(teardownDriver, abandoned.token), true);
assert.equal(completePresentationJob(teardownDriver, abandoned.token), false, 'late animation callback after teardown must be inert');
const afterCancel = snapshotPresentationJobDriver(teardownDriver);
assert.equal(afterCancel.completed, 0, 'cancelled jobs are not successful presentation completions');
assert.equal(afterCancel.cancelled, 1);
assert.equal(afterCancel.lastDurationMs, null, 'cancelled jobs do not pollute latency metrics');
const afterTeardown = beginNextPresentationJob(teardownDriver);
assert.equal(afterTeardown.job.event.type, 'DAMAGE_APPLIED', 'driver can resume from the next semantic job after teardown');

console.log('new-core presentation job driver: ok');
