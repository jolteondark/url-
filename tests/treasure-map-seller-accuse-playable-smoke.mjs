import assert from "node:assert/strict";
import { RubyMT19937Random } from "../runtime/ruby-mt19937-random.js";
import {
  resolveSafariTreasureMapSellerAccusation,
  safariTreasureMapSellerPresentation,
} from "../runtime/safari-treasure-map-interaction.js";

function seedFor(predicate) {
  for (let seed = 1; seed < 10000; seed += 1) {
    const roll = new RubyMT19937Random(seed & 0x7fffffff).randInt(100);
    if (predicate(roll)) return seed;
  }
  throw new Error("unable to find deterministic treasure-map accusation seed");
}

function runtimeFor(seed) {
  return {
    player:{ party:[{ species:"UMBREON", type_ids:["DARK"], hp:10, egg:false }] },
    variables:{ mapless:{
      day:1,
      board_events:[{
        kind:"normal_event",
        normal_event_id:"treasure_map_seller",
        normal_seed:seed,
        normal_resolved:false,
        normal_data:{ fake:true },
      }],
      board_revealed:[false],
      board_visited:[false],
      board_consumed:[false],
      battle:null,
      shop:null,
      last_operations:[],
    } },
    bag:{ slots:[], money:1000 },
  };
}

{
  const runtime = runtimeFor(seedFor((roll) => roll < 50));
  const ui = safariTreasureMapSellerPresentation(runtime, 0);
  assert.equal(ui.fakeKnown, true);
  assert.deepEqual(ui.actions.map((action) => action.id), ["accuse", "buy", "leave"]);

  const result = await resolveSafariTreasureMapSellerAccusation(runtime, 0);
  assert.equal(result.completed, true);
  assert.ok(result.seededRoll < 50);
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
  assert.equal(runtime.variables.mapless.mapless_treasure_map, undefined);
  assert.ok(result.operations.some((operation) => operation.op === "request_save"));
  assert.equal(result.persistenceRequested, true);
}

{
  const runtime = runtimeFor(seedFor((roll) => roll < 50));
  runtime.player.party[0].type_ids = ["NORMAL"];
  const ui = safariTreasureMapSellerPresentation(runtime, 0);
  assert.equal(ui.fakeKnown, false);
  assert.deepEqual(ui.actions.map((action) => action.id), ["buy", "leave"]);
  const result = await resolveSafariTreasureMapSellerAccusation(runtime, 0);
  assert.equal(result.result, "accuse_unavailable");
  assert.equal(result.completed, false);
  assert.equal(runtime.variables.mapless.board_consumed[0], false);
}

console.log("treasure map seller accuse playable smoke: ok");