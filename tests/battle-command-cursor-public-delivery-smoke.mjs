import assert from "node:assert/strict";
import fs from "node:fs";

const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const bridge = fs.readFileSync(new URL("../canonical-battle-ui-bridge.js", import.meta.url), "utf8");

const revision = loader.match(/BATTLE_PRESENTATION_PUBLIC_REVISION = "([^"]+)"/)?.[1];
assert.equal(revision, "20260902-1131", "shared Battle presentation revision must advance after the command-cursor consumer change");
assert.match(loader, /battlePresentationUrl\("\.\/canonical-battle-ui-bridge\.js"\)/, "Battle chrome must load the canonical UI bridge through the shared revision helper");
assert.match(bridge, /canonicalBattleUiAssetUrl\("cursor_command\.png"\)/, "reachable canonical Battle UI bridge must consume the command cursor sheet");

console.log("ok - Battle command cursor public delivery generation");
