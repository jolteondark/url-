import assert from "node:assert/strict";
import { projectSafariBattleOperationsToPresentation } from "../runtime/safari-normal-battle-round.js";
import { formatSafariBattlePresentationEvent } from "../battle-presentation-narration.js";

const ownerOperations = [
  { op: "faint", target: "foe" },
  { op: "gain_exp", amount: 87, scope: "exp" },
  { op: "level_up", level: 12, scope: "exp" },
  { op: "learn_move", move: "QUICKATTACK", slot: 2, scope: "exp" },
  { op: "end_of_round", round: 1 },
];
const events = projectSafariBattleOperationsToPresentation(ownerOperations, {
  player: { species: "PIKACHU", maxHp: 35 },
  foe: { species: "RATTATA", maxHp: 22 },
});
assert.deepEqual(events.map((event) => event.type), [
  "faint",
  "exp_gain",
  "level_up",
  "move_learned",
  "turn_end",
], "Safari must preserve the mechanics owner's post-KO EXP/level/move order rather than inventing a second lifecycle");
assert.equal(events[1].amount, 87);
assert.equal(events[2].level, 12);
assert.equal(events[3].moveId, "QUICKATTACK");

assert.match(formatSafariBattlePresentationEvent(events[1], { actorName: "ピカチュウ" }), /87 EXP/);
assert.match(formatSafariBattlePresentationEvent(events[2], { actorName: "ピカチュウ" }), /Lv\.12/);
assert.match(formatSafariBattlePresentationEvent(events[3], { actorName: "ピカチュウ", moveName: "でんこうせっか" }), /でんこうせっかを覚えた/);

const resultText = formatSafariBattlePresentationEvent({
  type: "battle_result",
  decision: 1,
  expGained: 87,
  reward: { item: "POTION", quantity: 1 },
  moneyGained: 320,
  returnTarget: "day_board",
});
assert.match(resultText, /勝利/);
assert.match(resultText, /87 EXP/);
assert.match(resultText, /POTION ×1/);
assert.match(resultText, /320円/);
assert.match(resultText, /ReturnでDay Boardへ/);

const evolutionEvents = projectSafariBattleOperationsToPresentation([
  { op: "level_evolution", from: "BULBASAUR", to: "IVYSAUR", scope: "exp" },
]);
assert.deepEqual(evolutionEvents, [{ type: "evolution", actor: "player", from: "BULBASAUR", to: "IVYSAUR" }],
  "when the mechanics owner emits level_evolution, Safari only projects that owner operation");

console.log("Safari post-victory presentation preserves owner EXP/level/move/evolution/result lifecycle: ok");
