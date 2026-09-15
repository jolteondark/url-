import { getShowdownBattleEnginePin } from './showdown-pin.js';

function requireFunction(value, name) {
  if (typeof value !== 'function') throw new Error(`Showdown runtime missing ${name}`);
  return value;
}

/**
 * Validates the browser artifact boundary before New Core may execute battle semantics.
 * The artifact is built/vendored separately from the exact pinned Showdown revision.
 * This module deliberately owns no Pokemon mechanics.
 */
export function createPinnedShowdownRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') {
    throw new Error('Showdown runtime artifact is unavailable');
  }

  const expected = getShowdownBattleEnginePin();
  const actualRevision = String(runtime.revision ?? '');
  const actualLicense = String(runtime.license ?? '');
  if (actualRevision !== expected.revision) {
    throw new Error(`Showdown revision mismatch: expected ${expected.revision}, got ${actualRevision || '<missing>'}`);
  }
  if (actualLicense !== expected.license) {
    throw new Error(`Showdown license metadata mismatch: expected ${expected.license}, got ${actualLicense || '<missing>'}`);
  }

  const createBattle = requireFunction(runtime.createBattle, 'createBattle');
  return Object.freeze({
    revision: actualRevision,
    license: actualLicense,
    createBattle(options) {
      const battle = createBattle(options);
      if (!battle || typeof battle !== 'object') throw new Error('Showdown createBattle returned no battle');
      requireFunction(battle.choose, 'battle.choose');
      requireFunction(battle.snapshot, 'battle.snapshot');
      return battle;
    },
  });
}
