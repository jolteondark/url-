import assert from "node:assert/strict";
import fs from "node:fs";
import { minimumExpForLevel } from "../runtime/pokemon-growth-rate.js";
import { resolvePokemonRuntimeMasters } from "../runtime/pokemon-runtime-masters.js";
import {
  resolveSafariStreetPerformerInteraction,
  safariStreetPerformerChoices,
} from "../runtime/safari-street-performer-interaction.js";
import {
  SAFARI_MOVE_MASTERS,
  SAFARI_SPECIES_MASTERS,
} from "../runtime/safari-playable-data.js";

const source = fs.readFileSync(new URL("../runtime/safari-street-performer-interaction.js", import.meta.url), "utf8");
assert.match(source, /import \{ healSafariPartyPercent \} from "\.\/safari-pokemon-healing\.js";/);
assert.match(source, /healSafariPartyPercent\(runtime, 10\)/);
assert.doesNotMatch(source, /function healPartyTenPercent\(/);
assert.doesNotMatch(source, /updatePokemonRuntime/);

const zeroStats = { HP:0, ATTACK:0, DEFENSE:0, SPECIAL_ATTACK:0, SPECIAL_DEFENSE:0, SPEED:0 };
const species = {
  id:"STREETTEST",
  name:"Street Test",
  types:["FIRE", "NORMAL"],
  growth_rate:"Medium",
  base_exp:60,
  catch_rate:255,
  base_stats:{ HP:40, ATTACK:40, DEFENSE:40, SPECIAL_ATTACK:40, SPECIAL_DEFENSE:40, SPEED:40 },
  level_moves:[],
  evolutions:[],
};
Object.assign(SAFARI_SPECIES_MASTERS, { STREETTEST:species });
Object.assign(SAFARI_MOVE_MASTERS, {
  STREETFIRE:{ id:"STREETFIRE", name:"Street Fire", category:"Physical", power:40, accuracy:100, total_pp:20, priority:0, type:"FIRE", thaws_user:false },
  STREETWATER:{ id:"STREETWATER", name:"Street Water", category:"Physical", power:40, accuracy:100, total_pp:20, priority:0, type:"WATER", thaws_user:false },
});

function pokemon(moveId="STREETFIRE") {
  const result = resolvePokemonRuntimeMasters({
    species:"STREETTEST",
    level:10,
    exp:minimumExpForLevel("Medium", 10),
    personal_id:822,
    gender:0,
    form:0,
    hp:20,
    status:"NONE",
    status_count:0,
    item:null,
    ability_id:null,
    ability_index:0,
    nature_id:"HARDY",
    iv:zeroStats,
    ev:zeroStats,
    moves:[{ id:moveId, pp:10, ppup:0 }],
  }, {
    species_master:species,
    nature_master:{ id:"HARDY", stat_changes:[] },
    move_masters:SAFARI_MOVE_MASTERS,
  });
  result.hp = 20;
  return result;
}
function event(fraudRoll=80) {
  return { kind:"normal_event", normal_event_id:"street_performer", normal_seed:822, normal_resolved:false, normal_data:{ fraud_roll:fraudRoll } };
}
function runtime(sourceEvent, mon=pokemon()) {
  return {
    player:{ party:[mon] },
    bag:{ slots:[], money:2000 },
    variables:{ mapless:{ day:3, location:"day_board", board_events:[structuredClone(sourceEvent)], board_revealed:[false], board_visited:[false], board_consumed:[false], battle:null, shop:null, last_operations:[], notice:"" } },
  };
}

{
  const current = runtime(event());
  const choices = (await safariStreetPerformerChoices(current)).map((entry) => entry.id);
  assert.deepEqual(choices, ["perform:0:FIRE", "perform:0:NORMAL"]);
  const beforeExp = current.player.party[0].exp;
  const beforeMoney = current.bag.money;
  const result = await resolveSafariStreetPerformerInteraction(current, 0, "perform:0:FIRE");
  assert.equal(result.result, "performance_type_move_bonus");
  assert.equal(current.variables.mapless.board_consumed[0], true);
  assert.equal(current.bag.money, beforeMoney + 1050);
  assert.equal(current.player.party[0].exp, beforeExp + 53);
  assert.equal(current.bag.slots.reduce((sum, slot) => sum + Number(slot?.[1] ?? 0), 0), 1);
}
{
  const current = runtime(event(), pokemon("STREETWATER"));
  const beforeMoney = current.bag.money;
  const result = await resolveSafariStreetPerformerInteraction(current, 0, "perform:0:FIRE");
  assert.equal(result.result, "performance");
  assert.equal(current.bag.money, beforeMoney + 700);
  assert.equal(current.bag.slots.length, 0);
}
{
  const current = runtime(event());
  current.player.party[0].hp = 10;
  current.player.party[0].max_hp = 20;
  const result = await resolveSafariStreetPerformerInteraction(current, 0, "watch");
  assert.equal(result.result, "watched_show");
  assert.equal(current.bag.money, 1700);
  assert.equal(current.player.party[0].hp, 12);
  assert.equal(current.variables.mapless.mapless_exp_show_battles, 1);
  assert.equal(current.variables.mapless.board_consumed[0], true);
}
{
  const current = runtime(event(80));
  const result = await resolveSafariStreetPerformerInteraction(current, 0, "callout");
  assert.equal(result.result, "false_accusation");
  assert.equal(current.variables.mapless.board_consumed[0], true);
}
{
  const current = runtime(event(10));
  const original = structuredClone(current.variables.mapless.board_events[0]);
  const result = await resolveSafariStreetPerformerInteraction(current, 0, "callout");
  assert.equal(result.result, "trainer_battle_handoff_required");
  assert.equal(result.completed, false);
  assert.equal(current.variables.mapless.board_consumed[0], false);
  assert.deepEqual(current.variables.mapless.board_events[0], original);
  assert.equal(result.operations[0].request.op, "start_trainer_battle");
}
{
  const current = runtime(event());
  const result = await resolveSafariStreetPerformerInteraction(current, 0, "leave");
  assert.equal(result.result, "left");
  assert.equal(current.variables.mapless.board_consumed[0], true);
}

console.log("Safari Street Performer canonical routes smoke passed");
