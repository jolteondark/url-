import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createStaticDexPackagingPlan, renderStaticDexManifestModule } from '../scripts/showdown-static-dex-plan.mjs';
import { SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';

const root = mkdtempSync(join(tmpdir(), 'mapless-showdown-static-dex-'));
execFileSync('git', ['init', '-q', root]);
execFileSync('git', ['-C', root, 'config', 'user.email', 'test@example.invalid']);
execFileSync('git', ['-C', root, 'config', 'user.name', 'Mapless Test']);
for (const relative of ['sim/battle.ts', 'sim/battle-actions.ts', 'sim/dex.ts', 'sim/prng.ts']) {
  mkdirSync(join(root, relative, '..'), { recursive: true });
  writeFileSync(join(root, relative), '// fixture\n');
}
const base = ['abilities','aliases','conditions','formats-data','items','learnsets','moves','natures','pokedex','pokemongo','rulesets','scripts','typechart'];
for (const name of base) {
  mkdirSync(join(root, 'data'), { recursive: true });
  writeFileSync(join(root, 'data', `${name}.ts`), 'export const fixture = {};\n');
}
mkdirSync(join(root, 'data/mods/gen9'), { recursive: true });
writeFileSync(join(root, 'data/mods/gen9/scripts.ts'), 'export const Scripts = { gen: 9 };\n');
writeFileSync(join(root, 'LICENSE'), 'Permission is hereby granted, free of charge, to any person obtaining a copy\n');
execFileSync('git', ['-C', root, 'add', '.']);
execFileSync('git', ['-C', root, 'commit', '-qm', 'fixture']);
execFileSync('git', ['-C', root, 'update-ref', 'refs/heads/main', SHOWDOWN_REVISION]);

// inspectPinnedShowdownSource intentionally requires HEAD to equal the real pin.
// A synthetic repository cannot manufacture that commit object, so assert the
// static manifest renderer independently and keep exact-revision gating covered
// by reconstruction-showdown-browser-source-smoke.mjs.
const rendered = renderStaticDexManifestModule({
  repository: 'smogon/pokemon-showdown',
  revision: SHOWDOWN_REVISION,
  baseModules: base.map(name => `${name}.ts`),
  mods: ['gen9'],
  runtimePolicy: { filesystem: false, dynamicRequire: false, generatedAtBuildTime: true },
});
assert.match(rendered, /SHOWDOWN_STATIC_DEX_MANIFEST/);
assert.match(rendered, /"filesystem": false/);
assert.throws(() => renderStaticDexManifestModule({ runtimePolicy: { filesystem: true, generatedAtBuildTime: true } }), /forbid runtime filesystem/);

console.log('Showdown static Dex packaging boundary smoke passed');
