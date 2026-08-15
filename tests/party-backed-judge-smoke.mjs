import assert from "node:assert/strict";
import { resolveJudgeCanonical } from "../runtime/battle-core-judge.js";
import { resolveBattleLoopCanonical } from "../runtime/battle-core-battle-loop.js";

const judge = resolveJudgeCanonical({
  playerParty: [{ species: "EEVEE", hp: 12, egg: false }],
  foeParty: [{ species: "RATTATA", hp: 0, egg: false }],
  playerAllFainted: true,
  foeAllFainted: false,
});
assert.equal(judge.sourceComplete, true);
assert.equal(judge.playerAllFainted, false);
assert.equal(judge.foeAllFainted, true);
assert.equal(judge.decision, 1);

const battle = resolveBattleLoopCanonical({
  rounds: [{
    commandDecision: 0,
    actions: [],
    priorityOrder: [],
    attackDecision: 0,
    endJudgeState: {
      playerParty: [{ species: "EEVEE", hp: 12, egg: false }],
      foeParty: [{ species: "RATTATA", hp: 0, egg: false }],
      playerAllFainted: true,
      foeAllFainted: false,
    },
  }],
});
const endJudge = battle.operations.find((operation) => operation.op === "judge" && operation.scope === "end_of_round");
assert.equal(endJudge.sourceComplete, true);
assert.equal(endJudge.playerAllFainted, false);
assert.equal(endJudge.foeAllFainted, true);
assert.equal(battle.decision, 1);

console.log("party-backed judge smoke: PASS");
