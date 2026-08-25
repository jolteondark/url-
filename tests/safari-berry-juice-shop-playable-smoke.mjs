import assert from "node:assert/strict";
import {
  resolveSafariBerryJuiceShopInteraction,
  safariBerryJuiceShopActions,
} from "../runtime/safari-berry-juice-shop-interaction.js";

function runtimeFor({ uses=0, slots=[["ORANBERRY",10]], seed=12345 } = {}) {
  return {
    bag:{ slots:structuredClone(slots), money:1000 },
    variables:{ mapless:{
      location:"day_board",
      battle:null,
      shop:null,
      preview_encounter_seed:seed,
      preview_encounter_counter:0,
      board_events:[{ kind:"normal_event", normal_event_id:"berry_juice_shop", normal_data:{ uses } }],
      board_revealed:[false],
      board_visited:[false],
      board_consumed:[false],
    } },
  };
}
function berryTotal(runtime) {
  return runtime.bag.slots
    .filter((slot) => /BERRY$/.test(String(slot?.[0] ?? "")))
    .reduce((sum, slot) => sum + Number(slot?.[1] ?? 0), 0);
}

{
  const runtime = runtimeFor();
  const result = resolveSafariBerryJuiceShopInteraction(runtime, 0, "basic");
  assert.equal(result.completed, false);
  assert.equal(result.persistenceRequested, true);
  assert.equal(runtime.variables.mapless.board_events[0].normal_data.uses, 1);
  assert.equal(runtime.variables.mapless.board_consumed[0], false);
  assert.equal(berryTotal(runtime), 7);
  assert.equal(runtime.variables.mapless.preview_encounter_counter, 2, "basic must use exactly two shared/global RNG samples");
  assert.ok(runtime.variables.mapless.last_operations.some((operation) => operation.op === "request_save"));
  assert.equal(safariBerryJuiceShopActions(runtime, 0)[0].meta.includes("残り2回"), true);
}

{
  const runtime = runtimeFor({ slots:[["ORANBERRY",5]] });
  const result = resolveSafariBerryJuiceShopInteraction(runtime, 0, "upper");
  assert.equal(result.persistenceRequested, true);
  assert.equal(berryTotal(runtime), 0);
  assert.equal(runtime.variables.mapless.preview_encounter_counter, 1, "upper must use exactly one shared/global RNG sample");
}

{
  const runtime = runtimeFor({ slots:[["CHERIBERRY",1],["PECHABERRY",2],["ORANBERRY",9]] });
  const result = resolveSafariBerryJuiceShopInteraction(runtime, 0, "status");
  assert.equal(result.persistenceRequested, true);
  assert.equal(runtime.variables.mapless.preview_encounter_counter, 0, "status recipe is deterministic");
  assert.equal(runtime.bag.slots.some(([id, qty]) => id === "FULLHEAL" && qty === 1), true);
  assert.equal(runtime.bag.slots.some(([id]) => id === "CHERIBERRY" || id === "PECHABERRY"), false);
}

{
  const runtime = runtimeFor({ slots:[["LIECHIBERRY",1],["ORANBERRY",2]] });
  const result = resolveSafariBerryJuiceShopInteraction(runtime, 0, "rare");
  assert.equal(result.persistenceRequested, true);
  assert.equal(berryTotal(runtime), 0);
  assert.equal(runtime.variables.mapless.preview_encounter_counter, 2, "rare must sample reward then owned rare berry from shared/global RNG");
}

{
  const runtime = runtimeFor({ uses:2, slots:[["ORANBERRY",3]] });
  const result = resolveSafariBerryJuiceShopInteraction(runtime, 0, "basic");
  assert.equal(result.completed, true);
  assert.equal(runtime.variables.mapless.board_events[0].normal_data.uses, 3);
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
}

{
  const runtime = runtimeFor({ slots:[["ORANBERRY",2]] });
  const before = structuredClone(runtime.bag.slots);
  const result = resolveSafariBerryJuiceShopInteraction(runtime, 0, "basic");
  assert.equal(result.completed, false);
  assert.equal(result.persistenceRequested, false);
  assert.deepEqual(runtime.bag.slots, before);
  assert.equal(runtime.variables.mapless.board_events[0].normal_data.uses, 0);
  assert.equal(runtime.variables.mapless.preview_encounter_counter, 0, "insufficient berries must not draw RNG");
}

{
  const rewardIds = ["FRESHWATER","SODAPOP","LEMONADE","MOOMOOMILK","POTION","SUPERPOTION"];
  const slots = [["ORANBERRY",3], ...rewardIds.map((id) => [id,99])];
  while (slots.length < 20) slots.push([`FILLER_${slots.length}`,99]);
  const runtime = runtimeFor({ slots });
  const before = structuredClone(runtime.bag.slots);
  const result = resolveSafariBerryJuiceShopInteraction(runtime, 0, "basic");
  assert.equal(result.persistenceRequested, false);
  assert.deepEqual(runtime.bag.slots, before, "failed reward preflight must leave Bag unchanged");
  assert.equal(runtime.variables.mapless.board_events[0].normal_data.uses, 0);
  assert.equal(runtime.variables.mapless.preview_encounter_counter, 2, "canonical reward draws happen before reward-space preflight");
}

{
  const runtime = runtimeFor({ uses:1 });
  const result = resolveSafariBerryJuiceShopInteraction(runtime, 0, "leave");
  assert.equal(result.completed, true);
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
  assert.equal(runtime.variables.mapless.board_events[0].normal_data.uses, 1, "leaving must preserve successful-use count for Save/Continue audit");
}

console.log("safari berry juice shop playable smoke: ok");
