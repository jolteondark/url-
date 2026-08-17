import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../battle-sprite-bridge.js", import.meta.url), "utf8");

assert.match(source, /globalThis\.__maplessSafariRuntime/, "battle sprites must read the exposed live Safari runtime");
assert.match(source, /battle\.player_party_index \?\? 0/, "player sprite identity must follow the active Party slot");
assert.match(source, /pokemon\.form == null \? 0 : Number\(pokemon\.form\)/, "explicit runtime form must be forwarded while omitted standard form remains zero");
assert.match(source, /resolveSafariBattleSpriteAsset\(\{ species, form, battlerIndex \}\)/, "resolved form must reach the existing form-aware asset resolver");
assert.doesNotMatch(source, /resolveSafariBattleSpriteAsset\(\{\s*species,\s*form:\s*0,/, "sprite bridge must not hard-code form zero at the resolver boundary");
assert.match(source, /window\.addEventListener\("safari-runtime-changed", renderBattlePresentation/, "committed battle-state events should refresh the sprite without a broader observer");
assert.match(source, /observer\.observe\(battleCard/, "existing observer must stay scoped to battle-card");
assert.doesNotMatch(source, /observer\.observe\(document\.body/, "form handoff must not introduce a body-wide observer");

console.log("Safari battle sprite form handoff smoke: ok");
