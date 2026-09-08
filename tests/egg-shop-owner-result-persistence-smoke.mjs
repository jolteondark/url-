import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const presentation = await readFile(new URL("../egg-shop-touch-presentation.js", import.meta.url), "utf8");
const owner = await readFile(new URL("../runtime/safari-egg-shop-interaction.js", import.meta.url), "utf8");
const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.match(owner, /\{ op:"request_save", reason:"egg_shop_purchase" \}/, "Egg Shop owner must request persistence");
assert.match(presentation, /safari-owner-result-persistence\.js/, "Egg Shop presentation must use shared owner-result persistence");
assert.match(presentation, /persistSafariOwnerResult\(current, result, window\.localStorage\)/, "Egg Shop owner result must be handed to shared persistence");
assert.doesNotMatch(presentation, /saveSafariPlayableRun/, "Egg Shop presentation must not call the persistence writer directly");
assert.doesNotMatch(presentation, /safari-web-startup\.js/, "Egg Shop presentation must not import startup just to save");
assert.match(indexHtml, /egg-shop-touch-presentation\.js\?v=20260908-2000/, "Egg Shop public script generation must publish the owner-result persistence change");
assert.doesNotMatch(indexHtml, /egg-shop-touch-presentation\.js\?v=20260820-2145/, "Egg Shop public script generation must not remain on the stale pre-convergence cache key");

console.log("egg-shop owner-result persistence smoke: ok");
