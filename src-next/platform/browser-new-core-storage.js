import { restoreNewCoreSave, serializeNewCoreSave } from '../core/persistence.js';

export const NEW_CORE_BROWSER_SAVE_KEY = 'mapless.new-core.v1';

function requireStorage(storage) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
    throw new TypeError('storage must implement getItem/setItem/removeItem');
  }
  return storage;
}

export function hasNewCoreBrowserSave(storage, key = NEW_CORE_BROWSER_SAVE_KEY) {
  return requireStorage(storage).getItem(key) !== null;
}

export function saveNewCoreBrowserRun(storage, state, key = NEW_CORE_BROWSER_SAVE_KEY) {
  const target = requireStorage(storage);
  const payload = serializeNewCoreSave(state);
  target.setItem(key, payload);
  return Object.freeze({ key, payload, operation: Object.freeze({ type: 'STORAGE_SET', key }) });
}

export function loadNewCoreBrowserRun(storage, key = NEW_CORE_BROWSER_SAVE_KEY) {
  const target = requireStorage(storage);
  const payload = target.getItem(key);
  if (payload === null) {
    return Object.freeze({ found: false, key, state: null, operation: Object.freeze({ type: 'STORAGE_MISS', key }) });
  }
  const state = restoreNewCoreSave(payload);
  return Object.freeze({ found: true, key, state, operation: Object.freeze({ type: 'STORAGE_GET', key }) });
}

export function clearNewCoreBrowserRun(storage, key = NEW_CORE_BROWSER_SAVE_KEY) {
  const target = requireStorage(storage);
  target.removeItem(key);
  return Object.freeze({ key, operation: Object.freeze({ type: 'STORAGE_REMOVE', key }) });
}
