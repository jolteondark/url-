import assert from "node:assert/strict";
import { resolvePokemonNest } from "../runtime/mapless-normal-events-a3-flow.js";
import { resolveSafariPokemonNestInteraction } from "../runtime/safari-pokemon-nest-interaction.js";
import { openSafariNormalEventTouch, supportsSafariNormalEventTouch } from "../runtime/safari-normal-event-touch-handoff.js";

function nest({ searchRoll=10, type="BUG", seed=810 }={}) {
  return {
    kind:"normal_event",
    normal_event_id:"pokemon_nest",
    normal_seed:seed,
    normal_resolved:false,
    normal_data:{ type, search_roll:searchRoll },
  };
}

function runtime(event, slots=[]) {
  return {
    player:{ party:[] },
    bag:{ slots:structuredClone(slots), money:0 },
    storage_system:{ boxes:[[]], currentBox:0 },
    variables:{ mapless:{
      day:3,
      location:"day_board",
      board_events:[structuredClone(event)],
      board_revealed:[false],
      board_visited:[false],
      board_consumed:[false],
      battle:null,
      shop:null,
      last_operations:[],
      notice:"",
    } },
  };
}

assert.equal(supportsSafariNormalEventTouch("pokemon_nest"), true);
{
  const current = runtime(nest());
  const ready = openSafariNormalEventTouch(current, 0);
  assert.deepEqual(ready.availableActions, ["observe", "search", "egg"]);
  assert.match(ready.normalEventUi.message, /BUG/);
}
{
  const current = runtime(nest());
  const result = await resolveSafariPokemonNestInteraction(current, 0, "observe");
  assert.equal(result.result, "observed");
  assert.equal(current.variables.mapless.board_consumed[0], true);
  assert.match(result.notice, /35EXP/);
  const canonical = resolvePokemonNest({ event:nest(), action:"observe", current_day:3 });
  assert.equal(canonical.operations.find((operation) => operation.op === "gain_party_exp").amount, 35);
}
{
  const current = runtime(nest({searchRoll:10}));
  const result = await resolveSafariPokemonNestInteraction(current, 0, "search");
  assert.equal(result.result, "search_reward");
  assert.equal(current.variables.mapless.board_consumed[0], true);
  assert.equal(current.bag.slots.reduce((sum, slot) => sum + Number(slot?.[1] ?? 0), 0), 1);
}
{
  const full = Array.from({length:20}, (_, index) => [`ITEM${index}`, 99]);
  const current = runtime(nest({searchRoll:10}), full);
  const result = await resolveSafariPokemonNestInteraction(current, 0, "search");
  assert.equal(result.result, "reward_bag_full");
  assert.equal(current.variables.mapless.board_consumed[0], false);
  assert.deepEqual(current.bag.slots, full);
}
{
  const emptySearch = resolvePokemonNest({ event:nest({searchRoll:99}), action:"search", current_day:3, search_reward_item:"POTION" });
  assert.equal(emptySearch.outcome, "search_empty");
  assert.equal(emptySearch.event.normal_resolved, true);

  const searchBattle = resolvePokemonNest({ event:nest({searchRoll:70}), action:"search", current_day:3, battle_success:false });
  const searchRequest = searchBattle.operations.find((operation) => operation.op === "start_wild_battle");
  assert.equal(searchRequest.modifier, 1);
  assert.equal(searchRequest.type, "BUG");

  const eggBattle = resolvePokemonNest({ event:nest(), action:"egg", current_day:3, battle_success:false });
  const eggRequest = eggBattle.operations.find((operation) => operation.op === "start_wild_battle");
  assert.equal(eggRequest.modifier, 2);
  assert.equal(eggRequest.type, "BUG");
}

console.log("Safari Pokémon Nest playable smoke passed");
