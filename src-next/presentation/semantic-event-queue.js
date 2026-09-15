const MESSAGE_EVENT_TYPES = new Set([
  'MOVE_USED',
  'MOVE_MISSED',
  'DAMAGE_APPLIED',
  'STATUS_APPLIED',
  'ABILITY_TRIGGERED',
  'ITEM_TRIGGERED',
  'POKEMON_FAINTED',
  'POKEMON_CAPTURED',
  'EXP_GAINED',
  'LEVEL_UP',
  'BATTLE_WON',
  'BATTLE_LOST',
]);

const ANIMATION_EVENT_TYPES = new Set([
  'BATTLE_STARTED',
  'POKEMON_SENT_OUT',
  'MOVE_USED',
  'MOVE_MISSED',
  'DAMAGE_APPLIED',
  'STATUS_APPLIED',
  'ABILITY_TRIGGERED',
  'ITEM_TRIGGERED',
  'POKEMON_FAINTED',
  'POKEMON_CAPTURED',
  'EXP_GAINED',
  'LEVEL_UP',
  'BATTLE_WON',
  'BATTLE_LOST',
]);

function cloneEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event) || !event.type) {
    throw new TypeError('presentation event requires an object with type');
  }
  return structuredClone(event);
}

export function createPresentationQueue() {
  return { sequence: 0, jobs: [] };
}

export function enqueuePresentationEvents(queue, events) {
  if (!queue || !Array.isArray(queue.jobs)) throw new TypeError('presentation queue is required');
  if (!Array.isArray(events)) throw new TypeError('events must be an array');

  for (const sourceEvent of events) {
    const event = cloneEvent(sourceEvent);
    const sequence = queue.sequence++;
    queue.jobs.push(Object.freeze({
      sequence,
      event,
      message: MESSAGE_EVENT_TYPES.has(event.type),
      animation: ANIMATION_EVENT_TYPES.has(event.type),
    }));
  }
  return queue;
}

export function shiftPresentationJob(queue) {
  if (!queue || !Array.isArray(queue.jobs)) throw new TypeError('presentation queue is required');
  return queue.jobs.shift() ?? null;
}

export function snapshotPresentationQueue(queue) {
  if (!queue || !Array.isArray(queue.jobs)) throw new TypeError('presentation queue is required');
  return Object.freeze({
    pending: queue.jobs.length,
    nextSequence: queue.sequence,
    jobs: Object.freeze(queue.jobs.map((job) => Object.freeze({
      sequence: job.sequence,
      type: job.event.type,
      message: job.message,
      animation: job.animation,
    }))),
  });
}
