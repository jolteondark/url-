import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { inspectPinnedShowdownSource } from './prepare-showdown-browser-source.mjs';

const BASE_DATA_MODULES = Object.freeze([
  'abilities',
  'aliases',
  'conditions',
  'formats-data',
  'items',
  'learnsets',
  'moves',
  'natures',
  'pokedex',
  'pokemongo',
  'rulesets',
  'scripts',
  'typechart',
]);

const REQUIRED_SUPPORT_MODULES = Object.freeze([
  'config/formats',
]);

const OPTIONAL_SUPPORT_MODULES = Object.freeze([
  'config/custom-formats',
]);

function requireModule(root, relative) {
  const candidates = [`${relative}.ts`, `${relative}.js`];
  const found = candidates.find(candidate => existsSync(join(root, candidate)));
  if (!found) throw new Error(`Pinned Showdown static Dex input missing ${relative}.{ts,js}`);
  return found;
}

function optionalModule(root, relative) {
  const candidates = [`${relative}.ts`, `${relative}.js`];
  return candidates.find(candidate => existsSync(join(root, candidate))) || null;
}

export function createStaticDexPackagingPlan(upstreamDir) {
  const source = inspectPinnedShowdownSource(upstreamDir);
  const root = resolve(upstreamDir);
  const dataRoot = join(root, source.dataRoot);
  const baseModules = BASE_DATA_MODULES.map(name => requireModule(dataRoot, name));
  const supportModules = REQUIRED_SUPPORT_MODULES.map(name => requireModule(root, name));
  const optionalSupportModules = OPTIONAL_SUPPORT_MODULES
    .map(name => optionalModule(root, name))
    .filter(Boolean);
  const modsRoot = join(dataRoot, 'mods');
  if (!existsSync(modsRoot)) throw new Error('Pinned Showdown static Dex input missing data/mods');
  const mods = readdirSync(modsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  if (!mods.includes('gen9')) throw new Error('Pinned Showdown static Dex input missing data/mods/gen9');

  return Object.freeze({
    repository: source.repository,
    revision: source.revision,
    baseModules: Object.freeze(baseModules),
    supportModules: Object.freeze(supportModules),
    optionalSupportModules: Object.freeze(optionalSupportModules),
    mods: Object.freeze(mods),
    runtimePolicy: Object.freeze({
      filesystem: false,
      dynamicRequire: false,
      generatedAtBuildTime: true,
    }),
  });
}

export function renderStaticDexManifestModule(plan) {
  if (!plan || plan.runtimePolicy?.filesystem !== false || plan.runtimePolicy?.generatedAtBuildTime !== true) {
    throw new Error('Static Dex plan must forbid runtime filesystem access');
  }
  return `// Generated from pinned Pokémon Showdown source; do not edit.\n` +
    `export const SHOWDOWN_STATIC_DEX_MANIFEST = ${JSON.stringify(plan, null, 2)};\n`;
}
