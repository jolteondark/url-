import assert from 'node:assert/strict';
import { createPresentationQueue, enqueuePresentationEvents } from '../src-next/presentation/semantic-event-queue.js';
import { createP1PresentationPump } from '../src-next/platform/p1-presentation-pump.js';

const queue = createPresentationQueue();
enqueuePresentationEvents(queue, [
  { type: 'BOARD_READY', day: 1 },
  { type: 'MOVE_USED', side: 'player', moveId: 'tackle' },
  { type: 'DAMAGE_APPLIED', side: 'foe', amount: 3 },
]);
let clock = 0;
let id = 0;
const timers = new Map();
const jobs = [];
const pump = createP1PresentationPump(queue, {
  now: () => clock,
  onJob: (job) => jobs.push(job.event.type),
  setTimer(callback, ms) {
    const token = ++id;
    timers.set(token, { callback, ms });
    return token;
  },
  clearTimer(token) { timers.delete(token); },
  messageDurationMs: 100,
  animationDurationMs: 50,
});

pump.kick();
assert.deepEqual(jobs, ['BOARD_READY', 'MOVE_USED'], 'nonvisual control event drains immediately before first timed job');
assert.equal(timers.size, 1);
assert.equal(pump.snapshot().activeTimers, 1);
assert.equal(pump.snapshot().driver.activeType, 'MOVE_USED');
let next = [...timers.entries()][0];
assert.equal(next[1].ms, 100);
timers.delete(next[0]);
clock += next[1].ms;
next[1].callback();
assert.deepEqual(jobs, ['BOARD_READY', 'MOVE_USED', 'DAMAGE_APPLIED']);
next = [...timers.entries()][0];
assert.equal(next[1].ms, 100);
timers.delete(next[0]);
clock += next[1].ms;
next[1].callback();
assert.equal(queue.jobs.length, 0);
assert.equal(pump.driver.completed, 3);
assert.equal(pump.snapshot().activeTimers, 0);
assert.equal(pump.snapshot().driver.pending, 0);

enqueuePresentationEvents(queue, [{ type: 'BATTLE_WON' }]);
pump.kick();
assert.equal(timers.size, 1);
pump.destroy();
assert.equal(timers.size, 0, 'destroy cancels presentation-only timer');
assert.equal(pump.snapshot().destroyed, true);
assert.equal(pump.snapshot().activeTimers, 0);
console.log('P1 event-driven presentation pump: ok');
