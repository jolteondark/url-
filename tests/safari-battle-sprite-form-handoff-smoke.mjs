import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../canonical-battle-sprite-bridge.js", import.meta.url), "utf8");

assert.match(source, /globalThis\.__maplessSafariRuntime/, "active battle sprite bridge must read the exposed live Safari runtime");
assert.match(source, /battle\.player_party_index \?\? 0/, "player sprite identity must follow the active Party slot");
assert.match(source, /pokemon\.form == null \? 0 : Number\(pokemon\.form\)/, "explicit runtime form must be forwarded while omitted standard form remains zero");
assert.match(source, /resolveCanonicalAsset\(\{ species, form, battlerIndex \}\)/, "resolved owner form must reach the active canonical asset resolver");
assert.doesNotMatch(source, /resolveCanonicalAsset\(\{\s*species,\s*form:\s*0,/, "active sprite bridge must not hard-code form zero");
assert.match(source, /window\.addEventListener\("safari-runtime-changed", schedule/, "committed battle-state events must refresh the active sprite bridge");
assert.doesNotMatch(source, /new MutationObserver\(/, "active sprite bridge must remain runtime-event driven");

console.log("Safari battle sprite form handoff smoke: ok");
