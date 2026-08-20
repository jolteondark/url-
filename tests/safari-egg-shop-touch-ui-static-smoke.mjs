import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runtimeSource = await readFile(new URL("../runtime/safari-egg-shop-interaction.js", import.meta.url), "utf8");
const bridgeSource = await readFile(new URL("../egg-shop-touch-presentation.js", import.meta.url), "utf8");
const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.equal(runtimeSource.includes("globalThis.prompt"), false, "Egg Shop owner must not fall back to browser prompt UI");
assert.equal(runtimeSource.includes("globalThis.confirm"), false, "Egg Shop owner must not fall back to browser confirm UI");
assert.equal(runtimeSource.includes("globalThis.alert"), false, "Egg Shop owner must not fall back to browser alert UI");
assert.equal(runtimeSource.includes("__maplessEggShopUi"), true, "Egg Shop owner must hand presentation to the shell bridge");

assert.equal(bridgeSource.includes("item.typeLabel"), true, "touch UI must project canonical type-only Egg labels");
assert.equal(bridgeSource.includes("item.species"), false, "touch UI must not reveal the hidden Egg species");
assert.equal(bridgeSource.includes("purchaseSafariEggShopEgg"), true, "touch UI must commit through the existing Egg Shop purchase owner");
assert.equal(bridgeSource.includes("saveSafariPlayableRun(window.localStorage, current)"), true, "successful touch purchase must persist through the existing Save owner");
const closeIndex = bridgeSource.indexOf("closeEggShopUi();", bridgeSource.indexOf('result.result === "bought"'));
const saveIndex = bridgeSource.indexOf("saveSafariPlayableRun(window.localStorage, current)");
assert.ok(closeIndex >= 0 && saveIndex > closeIndex, "ephemeral Egg Shop UI must close before persistence");
assert.equal(bridgeSource.includes('byId("save-run")'), false, "Egg Shop bridge must not override global Save-button availability");

assert.equal(indexSource.includes('id="egg-shop-card"'), true, "shell must contain an in-page Egg Shop scene");
assert.equal(indexSource.includes('id="egg-shop-choices"'), true, "shell must contain touch Egg choices");
assert.equal(indexSource.includes("egg-shop-touch-presentation.js"), true, "shell must load the Egg Shop touch bridge");
assert.equal(indexSource.includes("egg-shop-touch-presentation.css"), true, "shell must load the Egg Shop touch styles");
assert.equal(indexSource.includes("DELTADODUO"), false, "shell markup must not expose hidden Egg species names");

console.log("Safari Egg Shop in-page touch UI static smoke: PASS");
