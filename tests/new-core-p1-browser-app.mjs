import assert from 'node:assert/strict';
import {
  createP1BrowserApp,
  createP1BrowserRunId,
  createP1BrowserSeed,
} from '../src-next/platform/p1-browser-app.js';

let random = 0;
const fakeCrypto = {
  getRandomValues(values) {
    values[0] = ++random;
    return values;
  },
};
assert.equal(createP1BrowserSeed(fakeCrypto), 1);
assert.match(createP1BrowserRunId(fakeCrypto), /^web:[0-9a-f]+:[0-9a-f]+$/);

const calls = [];
const rendererState = { callbacks: null, renders: [], busy: [], messages: [], events: [] };
const controller = {
  presentationQueue: { jobs: [] },
  state: null,
  battle: null,
  saved: false,
  snapshot() {
    if (!this.state) throw new Error('no state');
    return structuredClone(this.state);
  },
  activeBattle() { return this.battle ? structuredClone(this.battle) : null; },
  hasSave() { return this.saved; },
  freshStart(identity) {
    calls.push(['freshStart', identity]);
    this.state = { mode: 'board', day: 1, money: 1000, board: [] };
  },
  continueRun() {
    calls.push(['continueRun']);
    this.state = { mode: 'board', day: 2, money: 1000, board: [] };
    return { found: true, state: this.state };
  },
  async prepareWild(slot) {
    calls.push(['prepareWild', slot]);
  },
  async startWildBattle(slot) {
    calls.push(['startWildBattle', slot]);
    this.state = { mode: 'battle_pending', day: 1, money: 1000, board: [] };
    this.battle = { battleId: 'b1', encounter: {} };
    return { resolved: { terminal: false, p1: [], p2: [] } };
  },
  async fight(moveSlot) {
    calls.push(['fight', moveSlot]);
    this.state = { mode: 'battle_result', day: 1, money: 1000, board: [], pendingBattleResult: { outcome: 'win' } };
    this.battle = null;
    this.saved = true;
    return { resolved: { terminal: true, winner: 'Mapless', p1: [], p2: [] } };
  },
  commitReward() {
    calls.push(['commitReward']);
    this.state = { mode: 'board', day: 1, money: 1000, board: [] };
  },
  advanceDay() {
    calls.push(['advanceDay']);
    this.state = { mode: 'board', day: 2, money: 1000, board: [] };
    this.saved = true;
  },
};

let pumpKicks = 0;
let pumpDestroyed = 0;
const root = { replaceChildren() { calls.push(['root.replaceChildren']); } };
const app = await createP1BrowserApp(root, {
  storage: {},
  crypto: fakeCrypto,
  showdownLoader: async ({ manifestUrl }) => ({
    showdown: { revision: 'fixture' },
    manifest: { manifestUrl },
  }),
  controllerFactory(options) {
    assert.deepEqual(options.showdown, { revision: 'fixture' });
    return controller;
  },
  rendererFactory(_root, callbacks) {
    rendererState.callbacks = callbacks;
    return {
      render(value) { rendererState.renders.push(structuredClone(value)); },
      setBusy(value) { rendererState.busy.push(Boolean(value)); },
      setMessage(value) { rendererState.messages.push(String(value)); },
      presentEvent(value) { rendererState.events.push(structuredClone(value)); },
    };
  },
  pumpFactory(_queue, { onJob }) {
    return {
      kick() {
        pumpKicks += 1;
        onJob({ event: { type: 'BATTLE_WON' } });
      },
      destroy() { pumpDestroyed += 1; },
    };
  },
  freshStartIdentity: () => ({ runId: 'browser-app-test', seed: 108 }),
});

assert.equal(rendererState.renders[0].state, null);
await rendererState.callbacks.onFreshStart();
assert.deepEqual(calls[0], ['freshStart', { runId: 'browser-app-test', seed: 108 }]);
assert.equal(rendererState.renders.at(-1).state.day, 1);
assert.equal(pumpKicks, 1);

await rendererState.callbacks.onBoardSlot(2, { kind: 'wild' });
assert.deepEqual(calls.slice(1, 3), [['prepareWild', 2], ['startWildBattle', 2]]);
assert.equal(rendererState.renders.at(-1).state.mode, 'battle_pending');

await rendererState.callbacks.onMove(1);
assert.deepEqual(calls.at(-1), ['fight', 1]);
assert.equal(rendererState.renders.at(-1).state.mode, 'battle_result');
assert.equal(rendererState.renders.at(-1).canContinue, true);

await rendererState.callbacks.onReward();
assert.deepEqual(calls.at(-1), ['commitReward']);
assert.equal(rendererState.renders.at(-1).state.mode, 'board');

await rendererState.callbacks.onBoardSlot(7, { kind: 'next_day' });
assert.deepEqual(calls.at(-1), ['advanceDay']);
assert.equal(rendererState.renders.at(-1).state.day, 2);

await rendererState.callbacks.onContinue();
assert.deepEqual(calls.at(-1), ['continueRun']);
assert.equal(rendererState.renders.at(-1).state.day, 2);
assert.ok(rendererState.messages.includes('戦闘に勝利した！'));
assert.ok(rendererState.events.some((event) => event.type === 'BATTLE_WON'));
assert.deepEqual(rendererState.busy.slice(0, 2), [true, false]);

app.destroy();
assert.equal(pumpDestroyed, 1);
assert.deepEqual(calls.at(-1), ['root.replaceChildren']);
console.log('P1 browser composition root wiring: ok');
