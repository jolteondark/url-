import assert from "node:assert/strict";
import {
  MAPLESS_OLD_STATUE_BONUS_STAT_ORDER_V108,
  MAPLESS_OLD_STATUE_STATUS_ORDER_V108,
  resolveMaplessOldStatueOutcomeV108,
  selectMaplessOldStatueBattleTypeV108,
  selectMaplessOldStatueBonusStatV108,
  selectMaplessOldStatueMineralV108,
  selectMaplessOldStatueTreasureV108,
} from "../runtime/mapless-old-statue-v108-inputs.js";
import { applySafariBattleRunConstraint, safariBattleCanRun } from "../runtime/safari-battle-run-constraint.js";

assert.deepEqual(MAPLESS_OLD_STATUE_BONUS_STAT_ORDER_V108,
  ["HP","ATTACK","DEFENSE","SPECIAL_ATTACK","SPECIAL_DEFENSE","SPEED"]);
assert.deepEqual(MAPLESS_OLD_STATUE_STATUS_ORDER_V108,
  ["POISON","PARALYSIS","BURN","SLEEP"]);

assert.deepEqual(resolveMaplessOldStatueOutcomeV108({ normalSeed:1, roll:10, goodLimit:50, neutralLimit:80 }),
  { branch:"good", effectIndex:1, status:null });
assert.deepEqual(resolveMaplessOldStatueOutcomeV108({ normalSeed:1, roll:60, goodLimit:50, neutralLimit:80 }),
  { branch:"neutral", effectIndex:2, status:null });
assert.deepEqual(resolveMaplessOldStatueOutcomeV108({ normalSeed:1, roll:99, goodLimit:75, neutralLimit:95 }),
  { branch:"bad", effectIndex:0, status:"POISON" });

let draws=0;
const first=(max)=>{ draws+=1; return 0 % max; };
assert.equal(selectMaplessOldStatueBattleTypeV108(first).value, "NORMAL");
assert.equal(selectMaplessOldStatueBonusStatV108(first).value, "HP");
assert.equal(selectMaplessOldStatueTreasureV108(["STARPIECE","COMETSHARD"], first).value, "STARPIECE");
assert.equal(selectMaplessOldStatueMineralV108(["HARDSTONE"], first).value, "HARDSTONE");
assert.equal(draws, 4, "each global .sample site must consume only its caller-owned shared draw");

const runtime={ variables:{ mapless:{ battle:{ kind:"wild", origin:"normal_event" } } } };
assert.equal(safariBattleCanRun(runtime), true);
applySafariBattleRunConstraint(runtime, true);
assert.equal(runtime.variables.mapless.battle.cannot_run, true);
assert.equal(safariBattleCanRun(runtime), false, "cannot_run must reach the shared Safari flee boundary");

console.log("Old Statue v0.9.108 source-owned inputs / run constraint smoke passed");
