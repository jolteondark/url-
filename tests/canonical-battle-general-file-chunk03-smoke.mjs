import assert from "node:assert/strict";
import { resolveSafariCanonicalFileBattleSprite } from "../runtime/safari-canonical-battle-sprite-assets.js";

const EXPECTED = Object.freeze({
  SABLEYE: "401d291098f40ed0abfa169b0a163535ce84cc8cbeb942a07e3fe525f733b6d6",
  HERACROSS: "5ea3ae9d4318330bcba0449216ba23c166d870e04edf3cb975e242343a7c3097",
  TROPIUS: "4ab10aaf31453c65184529f58b6c620e8e5b9aee185548b349b98ba87e2f036b",
  STUNFISK: "d72bb34c9547da0015ec1a2f345255963fc8e74c9f98c51fa25ebf057732ce04",
  LAPRAS: "e5b6054e105233cb5ce971a93d552d456a2496047d12e1a8b726e04d2049272f",
  KANGASKHAN: "82d670bf57f97b35176a86f25c22095e8766b9211dda4d8bcacfbf82363116fc",
  SEVIPER: "9487efea07dcaef42851a14617b596d2ef5e08f4993591e1cb7688e119631e64",
  SHUCKLE: "062fe2dd40bca8d81f28855e614b74958168b2e6c228820a3f7ba8d303c29f7f",
});

for (const [species, sha256] of Object.entries(EXPECTED)) {
  const foe = resolveSafariCanonicalFileBattleSprite({ species, side: "foe" });
  assert.equal(foe?.canonical_path, `Graphics/Pokemon/Front/${species}.png`);
  assert.equal(foe?.sha256, sha256);
  assert.equal(foe?.src, `./assets/canonical-battle-sprites/front/${species}.png`);
  assert.equal(resolveSafariCanonicalFileBattleSprite({ species, side: "player" }), null);
}

// Existing explicit player Back coverage must remain intact; never reuse a foe Front.
const dwebblePlayer = resolveSafariCanonicalFileBattleSprite({ species: "DWEBBLE", side: "player" });
assert.equal(dwebblePlayer?.canonical_path, "Graphics/Pokemon/Back/DWEBBLE.png");
assert.match(dwebblePlayer?.src ?? "", /\/back\/DWEBBLE\.png$/);

console.log("canonical GENERAL file-backed battle sprite chunk03 smoke: ok");
