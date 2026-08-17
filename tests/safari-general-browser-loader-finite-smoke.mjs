import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const loader = await readFile(new URL("../runtime/safari-general-encounter-data-loader.js", import.meta.url), "utf8");
const demand = await readFile(new URL("../runtime/safari-general-data-demand.js", import.meta.url), "utf8");
const deferred = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.doesNotMatch(loader, /fetchEncodedChunk/);
assert.doesNotMatch(loader, /fetch\(chunkUrl/);
assert.match(loader, /const BROWSER_IMPORT_BATCH = 4/);
assert.match(loader, /function withTimeout/);
assert.match(loader, /CHUNK_LOADERS\.slice\(start, end\)/);
assert.match(loader, /safari-general-load-progress/);
assert.match(loader, /Safari GENERAL decompression/);

assert.match(demand, /const DATA_IMPORT_TIMEOUT_MS = 60_000/);
assert.match(demand, /const COMBAT_IMPORT_TIMEOUT_MS = 20_000/);
assert.match(demand, /Safari GENERAL data import/);
assert.match(demand, /Safari GENERAL combat modules/);
assert.match(demand, /loading = null/);
assert.match(demand, /combatLoading = null/);

assert.match(deferred, /safari-general-load-progress/);
assert.match(deferred, /activeGeneralLoadLabel/);
assert.match(deferred, /loaded > 0 && total > 0/);
assert.match(deferred, /データの読み込みに失敗しました/);

console.log("Safari GENERAL browser loader finite smoke: ok");
