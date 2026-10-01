import assert from 'node:assert/strict';
import { createFreshRunState } from '../src-next/core/run/fresh-start.js';
import { step } from '../src-next/core/step.js';
import {
  NEW_CORE_BROWSER_SAVE_KEY,
  clearNewCoreBrowserRun,
  hasNewCoreBrowserSave,
  loadNewCoreBrowserRun,
  saveNewCoreBrowserRun,
} from '../src-next/platform/browser-new-core-storage.js';

function memoryStorage(shared = new Map()) {
  return {
    getItem(key) { return shared.has(key) ? shared.get(key) : null; },
    setItem(key, value) { shared.set(key, String(value)); },
    removeItem(key) { shared.delete(key); },
  };
}

const backing = new Map();
const firstPage = memoryStorage(backing);
let state = createFreshRunState({ runId: 'browser-reload', seed: 108 });
state = step(state, { type: 'GENERATE_DAY_BOARD' }).state;
assert.equal(hasNewCoreBrowserSave(firstPage), false);
const saved = saveNewCoreBrowserRun(firstPage, state);
assert.equal(saved.key, NEW_CORE_BROWSER_SAVE_KEY);
assert.equal(hasNewCoreBrowserSave(firstPage), true);

const reloadedPage = memoryStorage(backing);
const loaded = loadNewCoreBrowserRun(reloadedPage);
assert.equal(loaded.found, true);
assert.deepEqual(loaded.state, state, 'new browser page must Continue the exact canonical state');

clearNewCoreBrowserRun(reloadedPage);
assert.equal(hasNewCoreBrowserSave(firstPage), false);
assert.deepEqual(loadNewCoreBrowserRun(firstPage), {
  found: false,
  key: NEW_CORE_BROWSER_SAVE_KEY,
  state: null,
  operation: { type: 'STORAGE_MISS', key: NEW_CORE_BROWSER_SAVE_KEY },
});

const corrupt = memoryStorage(new Map([[NEW_CORE_BROWSER_SAVE_KEY, '{"bad":true}']]));
assert.throws(() => loadNewCoreBrowserRun(corrupt), /Unsupported New Core save format/);
console.log('New Core browser save/reload/Continue storage seam: ok');
