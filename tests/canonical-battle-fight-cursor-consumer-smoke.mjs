import assert from "node:assert/strict";
import fs from "node:fs";

const bridge = fs.readFileSync(new URL("../canonical-battle-ui-bridge.js", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.match(bridge, /canonicalBattleUiAssetUrl\("cursor_fight\.png"\)/, "fight menu must resolve the canonical cursor sheet through the shared resolver");
assert.match(bridge, /backgroundSize = "200% 1900%"/, "fight cursor sheet must be projected as 2 columns x 19 canonical type rows");
assert.match(bridge, /candidate === button/, "selected and unselected canonical cursor columns must follow the existing selected move");
assert.match(loader, /BATTLE_PRESENTATION_PUBLIC_REVISION = "20260902-0608"/, "Battle presentation public revision must include canonical fight cursor consumption");

console.log("canonical battle fight cursor consumer smoke: ok");
