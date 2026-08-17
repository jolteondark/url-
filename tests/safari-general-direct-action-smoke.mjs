import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const deferred = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const preview = await readFile(new URL("../preview.js", import.meta.url), "utf8");
const integration = await readFile(new URL("../runtime/safari-playable-integration.js", import.meta.url), "utf8");

assert.equal(deferred.includes("replayingCombatClicks"), false, "deferred UI loader must not track replayed combat clicks");
assert.equal(deferred.includes("stopImmediatePropagation"), false, "deferred UI loader must not intercept playable action propagation");
assert.equal(deferred.includes("button.click()"), false, "deferred UI loader must not synthesize a second playable click");
assert.equal(deferred.includes("safari-general-data-demand.js"), false, "deferred presentation loader must not own GENERAL runtime loading");

assert.match(preview, /from "\.\/runtime\/safari-general-data-demand\.js";/, "playable entry must own Board GENERAL readiness directly");
const boardAwait = preview.indexOf("await ensureBoardActionData(index);");
const boardActivate = preview.indexOf("activateSafariDayBoardCell(runtime, index);", boardAwait);
assert.ok(boardAwait >= 0 && boardActivate > boardAwait, "Board action must await required GENERAL data before activation");

assert.match(
  preview,
  /const result = await resolveSafariBattleRound\(runtime, button\.dataset\.moveId\);/,
  "Battle action must await the owner result instead of relying on click replay",
);
assert.match(
  integration,
  /return ensureSafariGeneralData\(\)\.then\(\(\) => resolveSafariBattleRound\(runtime, selectedMoveId\)\);/,
  "Battle owner must retain its direct lazy GENERAL readiness path",
);

console.log("safari-general-direct-action-smoke: ok");
