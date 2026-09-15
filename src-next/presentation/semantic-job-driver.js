import { shiftPresentationJob } from './semantic-event-queue.js';

export function createPresentationJobDriver(queue) {
  if (!queue || !Array.isArray(queue.jobs)) throw new TypeError('presentation queue is required');
  return {
    queue,
    active: null,
    completed: 0,
  };
}

export function beginNextPresentationJob(driver) {
  if (!driver || !driver.queue) throw new TypeError('presentation driver is required');
  if (driver.active) return null;

  const job = shiftPresentationJob(driver.queue);
  if (!job) return null;

  const token = Object.freeze({ sequence: job.sequence });
  driver.active = Object.freeze({ token, job });
  return driver.active;
}

export function completePresentationJob(driver, token) {
  if (!driver || !driver.queue) throw new TypeError('presentation driver is required');
  if (!driver.active) return false;
  if (!token || token.sequence !== driver.active.token.sequence) return false;

  driver.active = null;
  driver.completed += 1;
  return true;
}

export function snapshotPresentationJobDriver(driver) {
  if (!driver || !driver.queue) throw new TypeError('presentation driver is required');
  return Object.freeze({
    activeSequence: driver.active?.job.sequence ?? null,
    activeType: driver.active?.job.event.type ?? null,
    completed: driver.completed,
    pending: driver.queue.jobs.length,
  });
}
