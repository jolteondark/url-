import assert from 'node:assert/strict';
import { SHOWDOWN_LICENSE, SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';
import { createPinnedShowdownRuntime } from '../src-next/core/battle/showdown-runtime-gate.js';

assert.throws(() => createPinnedShowdownRuntime(null), /artifact is unavailable/);
assert.throws(() => createPinnedShowdownRuntime({
  revision: 'wrong', license: SHOWDOWN_LICENSE, createBattle() {},
}), /revision mismatch/);
assert.throws(() => createPinnedShowdownRuntime({
  revision: SHOWDOWN_REVISION, license: 'UNKNOWN', createBattle() {},
}), /license metadata mismatch/);

const commands = [];
const runtime = createPinnedShowdownRuntime({
  revision: SHOWDOWN_REVISION,
  license: SHOWDOWN_LICENSE,
  createBattle(options) {
    return {
      choose(command) { commands.push(command); },
      snapshot() { return { battleId: options.battleId, commands: commands.slice() }; },
    };
  },
});
const battle = runtime.createBattle({ battleId: 'b-1' });
battle.choose('move thunderbolt');
assert.deepEqual(battle.snapshot(), { battleId: 'b-1', commands: ['move thunderbolt'] });
assert.equal(runtime.revision, SHOWDOWN_REVISION);
assert.equal(runtime.license, 'MIT');

assert.throws(() => createPinnedShowdownRuntime({
  revision: SHOWDOWN_REVISION, license: SHOWDOWN_LICENSE, createBattle() { return {}; },
}).createBattle({ battleId: 'broken' }), /battle.choose/);

console.log('reconstruction showdown runtime gate smoke: ok');
