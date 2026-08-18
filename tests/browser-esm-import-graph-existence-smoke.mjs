import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entryFiles = [
  "preview.js",
  "preview-app.js",
  "selftest.js",
  "runtime/safari-battle-runtime-prewarm.js",
  "runtime/safari-web-playable-integration.js",
  "runtime/safari-web-combat-start.js",
  "runtime/safari-normal-battle-round.js",
  "runtime/safari-normal-battle-finalize.js",
];

function stripQueryHash(specifier) {
  return specifier.split(/[?#]/, 1)[0];
}

function relativeSpecifiers(source) {
  const found = new Set();
  const patterns = [
    /\b(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?["'](\.[^"']+)["']/g,
    /\bimport\s*\(\s*["'](\.[^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.add(match[1]);
  }
  return [...found];
}

function resolveRelative(fromFile, specifier) {
  const cleaned = stripQueryHash(specifier);
  const resolved = path.resolve(path.dirname(fromFile), cleaned);
  return resolved;
}

function assertInsideRepo(target, importer, specifier) {
  const relative = path.relative(root, target);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative),
    `${path.relative(root, importer)} imports outside repo: ${specifier}`);
}

const queue = entryFiles.map((file) => path.resolve(root, file));
const visited = new Set();
const missing = [];
const edges = [];

while (queue.length > 0) {
  const file = queue.shift();
  if (visited.has(file)) continue;
  visited.add(file);
  if (!fs.existsSync(file)) {
    missing.push({ importer: "<entry>", specifier: path.relative(root, file), resolved: path.relative(root, file) });
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  for (const specifier of relativeSpecifiers(source)) {
    const resolved = resolveRelative(file, specifier);
    assertInsideRepo(resolved, file, specifier);
    const edge = {
      importer: path.relative(root, file),
      specifier,
      resolved: path.relative(root, resolved),
    };
    edges.push(edge);
    if (!fs.existsSync(resolved)) {
      missing.push(edge);
      continue;
    }
    if (/\.(?:m?js)$/i.test(resolved)) queue.push(resolved);
  }
}

assert.deepEqual(missing, [],
  `browser ESM graph contains missing relative modules:\n${missing.map((entry) => `- ${entry.importer} -> ${entry.specifier} (${entry.resolved})`).join("\n")}`);
assert.ok(edges.length > 50, `browser ESM existence gate traversed suspiciously few imports: ${edges.length}`);
assert.ok(visited.has(path.resolve(root, "runtime/browser-battle-round-runtime.js")),
  "normal Battle graph must reach the browser round runtime");
assert.ok(visited.has(path.resolve(root, "runtime/browser-trainer-battle-round-runtime.js")),
  "normal Battle graph must reach the trainer round runtime");
assert.ok(visited.has(path.resolve(root, "runtime/safari-normal-battle-finalize.js")),
  "normal Battle graph must reach the direct finalizer");

console.log(`Browser ESM import graph existence: ${visited.size} modules / ${edges.length} relative edges / 0 missing`);
