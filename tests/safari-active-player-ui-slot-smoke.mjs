import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../preview-app.js", import.meta.url), "utf8");

const renderBattleStart = source.indexOf("function renderBattle() {");
const renderBattleEnd = source.indexOf("\nfunction render() {", renderBattleStart);
assert.ok(renderBattleStart >= 0 && renderBattleEnd > renderBattleStart, "renderBattle block must exist");
const renderBattle = source.slice(renderBattleStart, renderBattleEnd);

assert.match(
  renderBattle,
  /battle\.player_party_index/,
  "Battle UI must resolve the active player from battle.player_party_index",
);
assert.doesNotMatch(
  renderBattle,
  /runtime\.player\.party\[0\]/,
  "Battle UI must not hardcode Party slot 0",
);

const presentationStart = source.indexOf("async function playPresentation(events) {");
const presentationEnd = source.indexOf("\nfunction snapshotBoardCombatState", presentationStart);
assert.ok(presentationStart >= 0 && presentationEnd > presentationStart, "playPresentation block must exist");
const presentation = source.slice(presentationStart, presentationEnd);

assert.match(
  presentation,
  /battle\.player_party_index|activeBattlePlayer/,
  "player damage presentation must use the same active Battle slot",
);
assert.doesNotMatch(
  presentation,
  /event\.target === "player" \? runtime\.player\.party\[0\]/,
  "player damage presentation must not hardcode Party slot 0",
);

console.log("Safari Battle UI active player slot contract: ok");
