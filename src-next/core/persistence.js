import { NEW_CORE_SCHEMA_VERSION, assertSerializableGameState } from './game-state.js';

export const NEW_CORE_SAVE_FORMAT = 'mapless-new-core';

function assertEnvelope(envelope) {
  if (!envelope || envelope.format !== NEW_CORE_SAVE_FORMAT) throw new Error('Unsupported New Core save format');
  if (Number(envelope.schemaVersion) !== NEW_CORE_SCHEMA_VERSION) throw new Error('Unsupported New Core save schema');
  if (!envelope.state) throw new Error('New Core save is missing state');
}

export function createNewCoreSaveEnvelope(state) {
  const serializable = assertSerializableGameState(state);
  return {
    format: NEW_CORE_SAVE_FORMAT,
    schemaVersion: NEW_CORE_SCHEMA_VERSION,
    state: serializable,
  };
}

export function serializeNewCoreSave(state) {
  return JSON.stringify(createNewCoreSaveEnvelope(state));
}

export function restoreNewCoreSave(serialized) {
  if (typeof serialized !== 'string' || !serialized.trim()) throw new Error('New Core save payload is required');
  const envelope = JSON.parse(serialized);
  assertEnvelope(envelope);
  const state = assertSerializableGameState(envelope.state);
  if (!state.runId || state.runStatus !== 'active') throw new Error('New Core Continue requires an active run');
  if (!state.diagnostics || !Array.isArray(state.diagnostics.appliedResultIds)) throw new Error('New Core save diagnostics are invalid');
  return state;
}
