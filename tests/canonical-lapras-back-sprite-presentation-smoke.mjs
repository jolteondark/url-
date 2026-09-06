import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const resolverUrl = new URL("../runtime/canonical-battle-battler-assets.js", import.meta.url);
const resolver = readFileSync(resolverUrl, "utf8");
const assetUrl = new URL("../assets/canonical-battle-sprites/back/LAPRAS.png", import.meta.url);

assert.match(resolver, /CANONICAL_BATTLE_BACK_SPECIES[\s\S]*"LAPRAS"/, "shared battler resolver must enable LAPRAS on the player side");
assert.equal(existsSync(assetUrl), true, "canonical LAPRAS back sprite must be published at the exact-case path");

const png = readFileSync(assetUrl);
assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "LAPRAS back sprite must be a PNG");

console.log("canonical Lapras back sprite presentation smoke: ok");
