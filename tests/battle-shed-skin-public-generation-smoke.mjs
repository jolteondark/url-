import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const turnEndRuntime = fs.readFileSync(new URL('../runtime/battle-ability-item-turn-end-runtime.js', import.meta.url), 'utf8');
const turnEndStatus = fs.readFileSync(new URL('../runtime/battle-core-turn-end-status-item-extension.js', import.meta.url), 'utf8');
const battleIntegration = fs.readFileSync(new URL('../runtime/battle-runtime-integration.js', import.meta.url), 'utf8');

for (const path of [
  'safari-web-playable-integration.js',
  'safari-playable-integration.js',
  'safari-playable-integration-boundary.js',
  'safari-normal-battle-round-base.js',
  'browser-battle-round-runtime.js',
  'battle-core-combat-turn.js',
  'battle-runtime-integration.js',
  'battle-ability-item-turn-end-runtime.js',
  'battle-core-turn-end-status-item-extension.js',
]) {
  assert.match(html, new RegExp(`\\./runtime/${path.replaceAll('.', '\\.') }\\?v=20260910-0900`));
}

assert.doesNotMatch(html, /\.\/runtime\/(?:safari-normal-battle-round-base|browser-battle-round-runtime|battle-core-combat-turn)\.js\?v=20260907-0530/);
assert.match(turnEndStatus, /rollContextKey: "shedSkinRoll"/);
assert.match(turnEndRuntime, /materializeBattleTurnEndChanceContextRuntime/);
assert.match(turnEndRuntime, /requires combatRandomSeed/);
assert.doesNotMatch(turnEndRuntime, /Math\.random/);
assert.match(battleIntegration, /combatRandomSeed: Number\(preparedBattleInput\.combatRandomSeed\) & 0x7fffffff/);
assert.match(battleIntegration, /Boolean\(turnEndCommitted\.commit\?\.statusCured\)/);

console.log('battle Shed Skin public generation smoke: ok');
