import assert from "node:assert/strict";
import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync(new URL("../board-presentation-manifest.json", import.meta.url), "utf8"));
const adapter = fs.readFileSync(new URL("../normal-event-art-presentation.js", import.meta.url), "utf8");
const resolver = fs.readFileSync(new URL("../runtime/canonical-normal-event-art-assets.js", import.meta.url), "utf8");

assert.ok(manifest.modules.includes("./normal-event-art-presentation.js?v=20260913-2359"));
assert.match(adapter, /resolveCanonicalNormalEventArt\(active\.eventId\)/);
assert.match(adapter, /canonicalEventArt = "unpublished"/);
assert.match(adapter, /canonicalEventArt = "load-error"/);
assert.match(adapter, /retryingFailedPath/);
assert.match(adapter, /\?retry=\$\{Date\.now\(\)\}/);
assert.match(adapter, /delete card\.dataset\.canonicalEventArtPath/);
assert.match(adapter, /image\.hidden = true/);
assert.doesNotMatch(adapter, /ev_evolab|ev_statue|ev_wishingwell/);
assert.match(resolver, /const PUBLISHED_CANONICAL_NORMAL_EVENT_ART = new Set\(\);/);

console.log("normal-event art presentation smoke: ok");
