import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const shared = read("normal-event-touch-presentation.js");
const legacy = read("old-statue-touch-presentation.js");
const manifest = read("board-presentation-manifest.json");
const deferred = read("deferred-ui-loader.js");
const index = read("index.html");

assert.match(shared, /old_statue:\"\.\/runtime\/safari-old-statue-break-rewards\.js\?v=20260828-2320\"/);
assert.match(shared, /safariOldStatueOfferEntries/);
assert.match(shared, /safariOldStatueOfferNeedsPokemon/);
assert.match(shared, /safariOldStatuePrayNeedsPokemon/);
assert.match(shared, /safariOldStatueBonusCandidates/);
assert.match(shared, /oldStatueActionOptions\(/);
assert.match(shared, /persistSafariOwnerResult\(current, result, window\.localStorage\)/);
assert.match(shared, /result\.result === \"normal_event_wild_battle_started\"/);

assert.doesNotMatch(legacy, /addEventListener/);
assert.doesNotMatch(legacy, /stopImmediatePropagation/);
assert.doesNotMatch(legacy, /persistSafariOwnerResult/);

assert.match(manifest, /old-statue-touch-presentation\.js\?v=20260908-1530/);
assert.match(deferred, /old-statue-touch-presentation\.js\?v=20260908-1530/);
assert.match(index, /deferred-ui-loader\.js\?v=20260908-1530/);
assert.match(index, /normal-event-touch-presentation\.js\?v=20260908-1530/);

console.log("old-statue shared action owner smoke: ok");
