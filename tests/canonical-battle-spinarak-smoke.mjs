import assert from "node:assert/strict";
import { resolveSafariCanonicalBugBattleSprite } from "../runtime/safari-canonical-battle-sprite-bug.js";

const foe = resolveSafariCanonicalBugBattleSprite({ species: "SPINARAK", side: "foe" });
assert.equal(foe?.canonical_path, "Graphics/Pokemon/Front/SPINARAK.png");
assert.equal(foe?.sha256, "af660b4d626f8713487ad91504d8e5937468f7203a22f156682ca6a24fc62e04");
assert.match(foe?.src ?? "", /^data:image\/png;base64,/);

const player = resolveSafariCanonicalBugBattleSprite({ species: "SPINARAK", side: "player" });
assert.equal(player?.canonical_path, "Graphics/Pokemon/Back/SPINARAK.png");
assert.equal(player?.sha256, "b9ce11b63eebec6b2d90d9f3a962676fdd9b8222516deb7989a66ee6df963f1f");
assert.match(player?.src ?? "", /^data:image\/png;base64,/);

assert.equal(resolveSafariCanonicalBugBattleSprite({ species: "MISSING", side: "foe" }), null);
console.log("canonical Spinarak battle sprite smoke: ok");
