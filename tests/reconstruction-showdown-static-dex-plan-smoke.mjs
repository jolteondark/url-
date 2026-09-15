import assert from 'node:assert/strict';
import { renderStaticDexManifestModule } from '../scripts/showdown-static-dex-plan.mjs';
import { SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';

const base = ['abilities','aliases','conditions','formats-data','items','learnsets','moves','natures','pokedex','pokemongo','rulesets','scripts','typechart'];
const rendered = renderStaticDexManifestModule({
  repository: 'smogon/pokemon-showdown',
  revision: SHOWDOWN_REVISION,
  baseModules: base.map(name => `${name}.ts`),
  supportModules: ['config/formats.ts'],
  optionalSupportModules: [],
  mods: ['gen9'],
  runtimePolicy: { filesystem: false, dynamicRequire: false, generatedAtBuildTime: true },
});
assert.match(rendered, /SHOWDOWN_STATIC_DEX_MANIFEST/);
assert.match(rendered, /config\/formats\.ts/);
assert.match(rendered, /"filesystem": false/);
assert.match(rendered, /"generatedAtBuildTime": true/);
assert.throws(
  () => renderStaticDexManifestModule({ runtimePolicy: { filesystem: true, generatedAtBuildTime: true } }),
  /forbid runtime filesystem/
);

console.log('Showdown static Dex packaging boundary smoke passed');
