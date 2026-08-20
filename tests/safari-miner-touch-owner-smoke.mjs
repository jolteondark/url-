import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  MAPLESS_MINER_COLLAPSE_PERCENT_V108,
  MAPLESS_MINER_DIG_COST_V108,
  MAPLESS_MINER_OUTCOME_WEIGHTS_V108,
  maplessMinerFossilPoolForDayV108,
  openSafariMinerTouch,
  resolveSafariMinerAction,
} from "../runtime/safari-miner-interaction.js";

assert.equal(MAPLESS_MINER_DIG_COST_V108, 1000);
assert.equal(MAPLESS_MINER_COLLAPSE_PERCENT_V108, 5);
assert.deepEqual(MAPLESS_MINER_OUTCOME_WEIGHTS_V108, { fossil:20, valuable:25, stone:20, apology:25, run_away:10 });
assert.deepEqual(maplessMinerFossilPoolForDayV108(13), [
  "OMANYTE","KABUTO","AERODACTYL","LILEEP","ANORITH","CRANIDOS","SHIELDON","TIRTOUGA","ARCHEN","TYRUNT","AMAURA","DRACOZOLT","ARCTOZOLT","DRACOVISH","ARCTOVISH",
]);

function makeRuntime() {
  return {
    player:{ party:[{ species:"EEVEE", hp:50, max_hp:50 }, { species:"PIKACHU", hp:1, max_hp:35 }] },
    bag:{ money:5000, slots:[], max_slots:20, max_per_slot:99 },
    variables:{ mapless:{
      day:13, location:"day_board", battle:null, shop:null,
      board_events:[{kind:"type_event"},{kind:"miner"},{kind:"wild"},{kind:"tavern"},{kind:"shop"},{kind:"trainer"},{kind:"next_day"},{kind:"buried_item"}],
      board_revealed:Array(8).fill(false), board_visited:Array(8).fill(false), board_consumed:Array(8).fill(false), last_operations:[], notice:"",
    } },
  };
}
function injected(values) {
  let index = 0;
  return (limit) => {
    assert.ok(index < values.length, `unexpected random request limit=${limit}`);
    const value = values[index++];
    assert.ok(value >= 0 && value < limit, `injected value ${value} must fit limit ${limit}`);
    return value;
  };
}

const originalDocument = globalThis.document;
globalThis.document = {};
try {
  const runtime = makeRuntime();
  const ready = openSafariMinerTouch(runtime, 1);
  assert.equal(ready.result, "miner_ready");
  assert.deepEqual(ready.availableActions, ["dig","leave"]);
  assert.equal(runtime.variables.mapless.board_revealed[1], true);
  assert.equal(runtime.variables.mapless.board_visited[1], true);
  assert.equal(runtime.variables.mapless.board_consumed[1], false);
  assert.equal(globalThis.__maplessNormalEventUi.eventId, "miner");

  const rewarded = await resolveSafariMinerAction(runtime, 1, "dig", { randomInt:injected([99,20,0]) });
  assert.equal(runtime.bag.money, 4000, "one dig costs exactly 1000");
  assert.equal(rewarded.outcome, "valuable");
  assert.deepEqual(rewarded.reward, { kind:"item", itemId:"PEARL", quantity:1 });
  assert.equal(runtime.bag.slots.some((slot) => slot?.[0] === "PEARL" && slot[1] === 1), true);
  assert.equal(runtime.variables.mapless.board_consumed[1], false, "ordinary Miner outcomes keep the Miner reusable");
  assert.equal(rewarded.completed, false);
  assert.equal(rewarded.persistenceRequested, true);
  assert.equal(rewarded.operations.some((operation) => operation.op === "request_save"), true);

  const collapseRuntime = makeRuntime();
  const collapse = await resolveSafariMinerAction(collapseRuntime, 1, "dig", { randomInt:injected([0,65]) });
  assert.equal(collapseRuntime.bag.money, 4000);
  assert.equal(collapse.collapse.affected, 1);
  assert.equal(collapseRuntime.player.party[0].hp, 45, "collapse deals ceil(10% max HP) nonfatal damage");
  assert.equal(collapseRuntime.player.party[1].hp, 1, "collapse never faints a Pokemon already at 1 HP");
  assert.equal(collapse.outcome, "apology", "collapse must still continue into the canonical outcome roll");
  assert.equal(collapseRuntime.variables.mapless.board_consumed[1], false);

  const runawayRuntime = makeRuntime();
  const runaway = await resolveSafariMinerAction(runawayRuntime, 1, "dig", { randomInt:injected([99,90]) });
  assert.equal(runawayRuntime.bag.money, 4000);
  assert.equal(runaway.outcome, "run_away");
  assert.equal(runaway.completed, true);
  assert.equal(runaway.consumed, true);
  assert.equal(runawayRuntime.variables.mapless.board_consumed[1], true);

  const leaveRuntime = makeRuntime();
  const declined = await resolveSafariMinerAction(leaveRuntime, 1, "leave");
  assert.equal(leaveRuntime.bag.money, 5000);
  assert.equal(declined.completed, true, "leaving closes the touch scene");
  assert.equal(declined.consumed, false);
  assert.equal(leaveRuntime.variables.mapless.board_consumed[1], false, "leaving keeps Miner available for revisit");
} finally {
  globalThis.__maplessNormalEventUi = null;
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
}

const source = await readFile(new URL("../runtime/safari-miner-interaction.js", import.meta.url), "utf8");
const dispatcher = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const bridge = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
assert.equal(source.includes("createPokemonNewIndividualV108"), true, "fossil Pokemon must reuse the shared individual owner");
assert.equal(source.includes("ensureSafariGeneralData"), true);
assert.equal(source.includes("maplessEggShopHatchLevelForDayV108"), true, "Miner fossil level must reuse canonical NORMAL scaling");
assert.equal(dispatcher.includes('event?.kind === "miner"'), true);
assert.equal(dispatcher.includes("openSafariMinerTouch(runtime, index)"), true);
assert.equal(bridge.includes('miner:"./runtime/safari-miner-interaction.js"'), true);
assert.equal(bridge.includes("resolveSafariMinerAction(current, active.boardIndex, actionId)"), true);
assert.equal(bridge.includes("globalThis.prompt"), false);
assert.equal(bridge.includes("globalThis.confirm"), false);
assert.equal(bridge.includes("globalThis.alert"), false);

console.log("Safari Miner touch owner smoke: PASS");
