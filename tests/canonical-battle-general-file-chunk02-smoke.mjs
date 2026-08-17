import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolveSafariCanonicalFileBattleSprite } from "../runtime/safari-canonical-battle-sprite-assets.js";

const expected = Object.freeze({
  CATERPIE: "ea82756c7454f6b90c575be85623e1b6ac1bf01009449f43487252c6d6d9f45b",
  PICHU: "15be29146c380ffbe830b54458604bb52bcba9452989623b543b6875d27d5266",
  CHARMANDER: "1ff9acd5fe6ea9c4bc51227c7ebb08a1adaf2685023ab9adf38ffd13fc1f537c",
  PIDGEY: "e83d96ae291d432348ad65e038bcd6684ade6685623198694584405a3341371f",
  RALTS: "675c51f4a428db63adeb6e99d62c9e2381df9202442f9754418db65a19f51a6c",
  GASTLY: "5ac1b474a349a1ea5ae4acc83e2fc9e42aea31351e7098e4f571fbb42416f652",
});

for (const [species, sha256] of Object.entries(expected)) {
  const asset = resolveSafariCanonicalFileBattleSprite({ species, form: 0, side: "foe" });
  assert.ok(asset, `${species} resolver entry`);
  assert.equal(asset.sha256, sha256);
  assert.equal(asset.side, "foe");
  assert.match(asset.src, new RegExp(`/front/${species}\\.png$`));
  const data = await readFile(new URL(`../assets/canonical-battle-sprites/front/${species}.png`, import.meta.url));
  assert.equal(createHash("sha256").update(data).digest("hex"), sha256);
  assert.equal(resolveSafariCanonicalFileBattleSprite({ species, form: 0, side: "player" }), null);
}

console.log("canonical battle general file chunk 02 smoke: ok");
