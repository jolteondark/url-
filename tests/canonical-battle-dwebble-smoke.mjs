import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolveSafariCanonicalFileBattleSprite } from "../runtime/safari-canonical-battle-sprite-assets.js";

const expected = [
  {
    side: "foe",
    path: "assets/canonical-battle-sprites/front/DWEBBLE.png",
    canonicalPath: "Graphics/Pokemon/Front/DWEBBLE.png",
    sha256: "24948e44497556a3a0c36012e85c94d74ea5a8e0644ef18e366dc7ca395b518e",
  },
  {
    side: "player",
    path: "assets/canonical-battle-sprites/back/DWEBBLE.png",
    canonicalPath: "Graphics/Pokemon/Back/DWEBBLE.png",
    sha256: "7a146844573421dad53802c2ebbe71752d09c8e925276b064cd2abfe73840055",
  },
];

for (const row of expected) {
  const bytes = await readFile(new URL(`../${row.path}`, import.meta.url));
  const hash = createHash("sha256").update(bytes).digest("hex");
  assert.equal(hash, row.sha256);
  const asset = resolveSafariCanonicalFileBattleSprite({ species: "DWEBBLE", side: row.side, form: 0 });
  assert.equal(asset?.canonical_path, row.canonicalPath);
  assert.equal(asset?.sha256, row.sha256);
}

assert.equal(resolveSafariCanonicalFileBattleSprite({ species: "CATERPIE", side: "foe" }), null);
console.log("canonical DWEBBLE battle sprite smoke: ok");
