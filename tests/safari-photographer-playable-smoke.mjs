import assert from "node:assert/strict";
import { resolveSafariPhotographerInteraction, safariPhotographerPartyChoices } from "../runtime/safari-photographer-interaction.js";
import { openSafariNormalEventTouch, supportsSafariNormalEventTouch } from "../runtime/safari-normal-event-touch-handoff.js";

function runtime({ shiny = false } = {}) {
  return {
    variables:{ mapless:{
      day:6,
      location:"day_board",
      board_events:[{ kind:"normal_event", normal_event_id:"photographer", normal_seed:41, normal_data:{ requested_type:"WATER" } }],
      board_consumed:[false], board_revealed:[false], board_visited:[false],
    } },
    player:{ party:[{ species:"TESTMON", nickname:null, level:12, hp:20, egg:false, types:["WATER"], shiny }] },
    bag:{ slots:[], money:100 },
  };
}

assert.equal(supportsSafariNormalEventTouch("photographer"), true);
{
  const current = runtime();
  const choices = safariPhotographerPartyChoices(current, current.variables.mapless.board_events[0]);
  assert.deepEqual(choices.map((entry) => entry.id), ["party:0"]);
  const opened = openSafariNormalEventTouch(current, 0);
  assert.equal(opened.result, "photographer_ready");
  assert.ok(opened.availableActions.includes("party:0"));
  assert.ok(opened.availableActions.includes("wild"));
  assert.ok(opened.availableActions.includes("leave"));
}
{
  const current = runtime();
  const result = await resolveSafariPhotographerInteraction(current, 0, "party:0");
  assert.equal(result.result, "party_regular");
  assert.equal(result.completed, true);
  assert.equal(current.bag.money, 800); // day 6 => scaling 1 => 600 + 100
  assert.equal(current.variables.mapless.board_consumed[0], true);
  assert.equal(result.persistenceRequested, true);
}
{
  const current = runtime({ shiny:true });
  const result = await resolveSafariPhotographerInteraction(current, 0, "party:0");
  assert.equal(result.result, "party_special");
  assert.equal(current.bag.money, 1400); // day 6 => 1200 + 100
  assert.equal(current.variables.mapless.board_consumed[0], true);
}
{
  const current = runtime();
  current.player.party[0].types = ["FIRE"];
  const opened = openSafariNormalEventTouch(current, 0);
  assert.ok(!opened.availableActions.some((id) => id.startsWith("party:")));
  assert.ok(opened.availableActions.includes("wild"));
}
{
  const current = runtime();
  const result = await resolveSafariPhotographerInteraction(current, 0, "leave");
  assert.equal(result.result, "left");
  assert.equal(current.variables.mapless.board_consumed[0], true);
}

console.log("safari-photographer-playable-smoke: ok");
