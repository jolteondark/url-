import assert from "node:assert/strict";
import { resolveSafariCanonicalFileBattleSprite } from "../runtime/safari-canonical-battle-sprite-assets.js";

const EXPECTED = Object.freeze({
  PLUSLE: "4d93944d4d4fd19708537341c02896cfd530c9ba11859464cc3419e6afc2424a",
  DRUDDIGON: "02a125e6123dacdfb17389f2978eaa179c44c28165e0f00ac30e42362b4bfda6",
  MAWILE: "9dfc01d9997e49b2f994d852d74c78e9e92b08c4f3b24beb1120f027732122fe",
});
for (const [species, sha256] of Object.entries(EXPECTED)) {
  const foe = resolveSafariCanonicalFileBattleSprite({ species, side: "foe" });
  assert.equal(foe?.canonical_path, `Graphics/Pokemon/Front/${species}.png`);
  assert.equal(foe?.sha256, sha256);
  assert.equal(foe?.src, `./assets/canonical-battle-sprites/front/${species}.png`);
  assert.equal(resolveSafariCanonicalFileBattleSprite({ species, side: "player" }), null);
}
const dwebblePlayer = resolveSafariCanonicalFileBattleSprite({ species: "DWEBBLE", side: "player" });
assert.equal(dwebblePlayer?.canonical_path, "Graphics/Pokemon/Back/DWEBBLE.png");
assert.match(dwebblePlayer?.src ?? "", /\/back\/DWEBBLE\.png$/);
console.log("canonical GENERAL file-backed battle sprite chunk smoke: ok");
