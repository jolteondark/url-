import {
  beginNextPresentationJob,
  completePresentationJob,
  createPresentationJobDriver,
  snapshotPresentationJobDriver,
} from '../presentation/semantic-job-driver.js';

export function createP1PresentationPump(queue, {
  onJob = () => {},
  now,
  setTimer = globalThis.setTimeout?.bind(globalThis),
  clearTimer = globalThis.clearTimeout?.bind(globalThis),
  messageDurationMs = 420,
  animationDurationMs = 260,
} = {}) {
  if (typeof setTimer !== 'function' || typeof clearTimer !== 'function') throw new Error('presentation pump requires timer functions');
  const driver = createPresentationJobDriver(queue, { now });
  let timer = null;
  let destroyed = false;

  function durationFor(job) {
    if (job.message) return messageDurationMs;
    if (job.animation) return animationDurationMs;
    return 0;
  }

  function continuePump() {
    if (destroyed || driver.active) return;
    while (!destroyed) {
      const active = beginNextPresentationJob(driver);
      if (!active) return;
      onJob(active.job);
      const duration = durationFor(active.job);
      if (duration <= 0) {
        completePresentationJob(driver, active.token);
        continue;
      }
      timer = setTimer(() => {
        timer = null;
        completePresentationJob(driver, active.token);
        continuePump();
      }, duration);
      return;
    }
  }

  function kick() {
    continuePump();
  }

  function snapshot() {
    return Object.freeze({
      destroyed,
      timerActive: timer !== null,
      activeTimers: timer !== null ? 1 : 0,
      driver: snapshotPresentationJobDriver(driver),
    });
  }

  function destroy() {
    destroyed = true;
    if (timer !== null) clearTimer(timer);
    timer = null;
  }

  return Object.freeze({ kick, destroy, snapshot, driver });
}
