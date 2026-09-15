import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createStaticDexPackagingPlan } from './showdown-static-dex-plan.mjs';

function moduleStem(file) {
  return file.replace(/\.(?:ts|js)$/, '');
}

function importName(scope, stem, index) {
  return `__showdown_${scope.replace(/[^a-z0-9]+/gi, '_')}_${stem.replace(/[^a-z0-9]+/gi, '_')}_${index}`;
}

function moduleFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.(?:ts|js)$/.test(entry.name))
    .map(entry => entry.name)
    .sort();
}

export function createStaticDexEntryPlan(upstreamDir) {
  const packaging = createStaticDexPackagingPlan(upstreamDir);
  const root = resolve(upstreamDir);
  const dataRoot = join(root, 'data');
  const base = packaging.baseModules.map(file => ({ scope: 'base', file, absolute: join(dataRoot, file) }));
  const support = [...packaging.supportModules, ...packaging.optionalSupportModules]
    .map(file => ({ scope: 'support', file, absolute: join(root, file) }));
  const mods = packaging.mods.map(mod => {
    const dir = join(dataRoot, 'mods', mod);
    if (!existsSync(dir)) throw new Error(`Pinned Showdown static Dex mod missing: ${mod}`);
    return Object.freeze({
      mod,
      modules: Object.freeze(moduleFiles(dir).map(file => ({ scope: `mod_${mod}`, file, absolute: join(dir, file) }))),
    });
  });
  return Object.freeze({
    packaging,
    base: Object.freeze(base),
    support: Object.freeze(support),
    mods: Object.freeze(mods),
  });
}

export function renderStaticDexEntryModule(plan) {
  if (!plan?.packaging || !Array.isArray(plan.base) || !Array.isArray(plan.support) || !Array.isArray(plan.mods)) {
    throw new Error('Static Dex entry plan is invalid');
  }
  const imports = [];
  const baseEntries = [];
  const supportEntries = [];
  const modEntries = [];
  let index = 0;
  for (const module of plan.base) {
    const name = importName(module.scope, moduleStem(module.file), index++);
    imports.push(`import * as ${name} from ${JSON.stringify(module.absolute)};`);
    baseEntries.push(`${JSON.stringify(moduleStem(module.file))}: ${name}`);
  }
  for (const module of plan.support) {
    const name = importName(module.scope, moduleStem(module.file), index++);
    imports.push(`import * as ${name} from ${JSON.stringify(module.absolute)};`);
    supportEntries.push(`${JSON.stringify(moduleStem(module.file))}: ${name}`);
  }
  for (const mod of plan.mods) {
    const entries = [];
    for (const module of mod.modules) {
      const name = importName(module.scope, moduleStem(module.file), index++);
      imports.push(`import * as ${name} from ${JSON.stringify(module.absolute)};`);
      entries.push(`${JSON.stringify(moduleStem(module.file))}: ${name}`);
    }
    modEntries.push(`${JSON.stringify(mod.mod)}: Object.freeze({${entries.join(',')}})`);
  }
  return `${imports.join('\n')}\n` +
    `export const SHOWDOWN_STATIC_DEX_DATA = Object.freeze({\n` +
    `  revision: ${JSON.stringify(plan.packaging.revision)},\n` +
    `  base: Object.freeze({${baseEntries.join(',')}}),\n` +
    `  support: Object.freeze({${supportEntries.join(',')}}),\n` +
    `  mods: Object.freeze({${modEntries.join(',')}}),\n` +
    `});\n`;
}
