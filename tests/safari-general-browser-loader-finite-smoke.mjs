import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const loader = await readFile(new URL("../runtime/safari-general-encounter-data-loader.js", import.meta.url), "utf8");
const demand = await readFile(new URL("../runtime/safari-general-data-demand.js", import.meta.url), "utf8");
const deferred = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.match(loader, /const BROWSER_IMPORT_BATCH = 4/);
assert.match(loader, /function withTimeout/);
assert.match(loader, /CHUNK_PATHS\.slice\(start, end\)/);
assert.match(loader, /import\(new URL\(path, import\.meta\.url\)\.href\)/);
assert.match(loader, /new DecompressionStream\("deflate"\)/);
assert.match(loader, /Safari GENERAL decompression/);
assert.match(loader, /safari-general-encounter-data-v2-\$\{String\(index\)\.padStart\(2, "0"\)\}\.js/);
assert.doesNotMatch(loader, /^import chunk\d+/m, "GENERAL chunks must not all become static module dependencies again");
assert.doesNotMatch(loader, /fetch\(/, "GENERAL generated chunks must not be refetched as source text");

assert.match(demand, /let encounterLoading = null/);
assert.match(demand, /let trainerLoading = null/);
assert.match(demand, /loadEncounterRuntime/);
assert.match(demand, /loadTrainerGenerator/);
assert.match(demand, /safariGeneralCombatReady\(kind = null\)/);
assert.match(demand, /ensureSafariGeneralCombatData\(kind = null\)/);
assert.doesNotMatch(
  demand,
  /Promise\.all\(\[\s*import\("\.\/safari-general-encounter-runtime\.js"\),\s*import\("\.\/mapless-dynamic-trainer-generator\.js"\)/s,
  "wild and trainer combat imports must not be one all-or-nothing Promise.all gate",
);

assert.doesNotMatch(deferred, /safari-general-data-demand\.js/, "presentation loader must not own combat data demand");

console.log("Safari GENERAL finite combat-demand smoke: ok");
