import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../deferred-ui-loader.js', import.meta.url), 'utf8');

assert.match(source, /loadModule\("\.\/canonical-battleback-presentation-bridge\.js\?v=[^"\n]+"\)/);
assert.match(source, /async function loadBattleUi\(\)[\s\S]*canonical-battleback-presentation-bridge/);
assert.match(source, /if \(state\?\.battle\) \{[\s\S]*loadBattleUi\(\)/);

console.log('canonical battleback loader smoke: ok');
