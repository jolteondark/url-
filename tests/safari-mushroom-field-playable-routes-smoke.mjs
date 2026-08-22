import assert from "node:assert/strict";
import { SAFARI_SPECIES_MASTERS } from "../runtime/safari-playable-data.js";
import { openSafariNormalEventTouch } from "../runtime/safari-normal-event-touch-handoff.js";
import { resolveSafariMushroomFieldInteraction } from "../runtime/safari-mushroom-field-interaction.js";

function pokemon(species, hp = 20) {
  return {
    species,
    level: 10,
    moves: [],
    hp,
    max_hp: 20,
    status: "NONE",
    status_count: 0,
    stats: { ATTACK:10, DEFENSE:10, SPECIAL_ATTACK:10, SPECIAL_DEFENSE:10, SPEED:10 },
    mapless_bonus_stats: { HP:0, ATTACK:0, DEFENSE:0, SPECIAL_ATTACK:0, SPECIAL_DEFENSE:0, SPEED:0 },
  };
}

function runtime({ party, roll = 10, stat = "ATTACK", status = "POISON" }) {
  return {
    player: { party },
    bag: { slots: [], money: 0 },
    variables: {
      mapless: {
        day: 1,
        location: "day_board",
        board_events: [{
          kind: "normal_event",
          normal_event_id: "mushroom_field",
          normal_data: { eat_roll: roll, eat_stat: stat, bad_status: status },
        }],
        board_revealed: [false],
        board_visited: [false],
        board_consumed: [false],
      },
    },
  };
}

const originalPoison = Object.getOwnPropertyDescriptor(SAFARI_SPECIES_MASTERS, "TESTPOISON");
Object.defineProperty(SAFARI_SPECIES_MASTERS, "TESTPOISON", {
  configurable: true,
  enumerable: true,
  writable: true,
  value: Object.freeze({ id:"TESTPOISON", name:"Test Poison", types:Object.freeze(["POISON"]) }),
});

try {
  {
    const current = runtime({ party:[pokemon("EEVEE")] });
    const opened = openSafariNormalEventTouch(current, 0);
    assert.ok(opened.availableActions.includes("eat:0"), "ordinary party target must expose the risky eat route");
    assert.equal(opened.availableActions.some((action) => action.startsWith("poison:")), false, "no Poison type means no appraisal route");
    const result = resolveSafariMushroomFieldInteraction(current, 0, "eat:0");
    assert.equal(result.result, "eat_bonus");
    assert.equal(current.player.party[0].mapless_bonus_stats.ATTACK, 1);
    assert.equal(current.player.party[0].stats.ATTACK, 11);
    assert.equal(current.variables.mapless.board_consumed[0], true);
    assert.equal(result.persistenceRequested, true);
  }

  {
    const current = runtime({ party:[pokemon("EEVEE"), pokemon("TESTPOISON")] });
    const opened = openSafariNormalEventTouch(current, 0);
    assert.ok(opened.availableActions.includes("poison:0"), "captured-like Poison species master must unlock appraisal without inline types");
    const result = resolveSafariMushroomFieldInteraction(current, 0, "poison:0");
    assert.equal(result.result, "poison_appraised_bonus");
    assert.equal(current.player.party[0].mapless_bonus_stats.ATTACK, 1);
    assert.equal(current.player.party[0].stats.ATTACK, 11);
    assert.equal(current.player.party[1].mapless_bonus_stats.ATTACK, 0, "appraiser must not receive the target bonus");
    assert.equal(current.variables.mapless.board_consumed[0], true);
  }

  {
    const current = runtime({ party:[pokemon("EEVEE", 7)], roll:95 });
    const result = resolveSafariMushroomFieldInteraction(current, 0, "eat:0");
    assert.equal(result.result, "eat_damage");
    assert.equal(current.player.party[0].hp, 0, "canonical flat 25 damage must be applied to the selected target");
  }

  {
    const current = runtime({ party:[pokemon("EEVEE", 4)], roll:60 });
    current.player.party[0].status = "BURN";
    const result = resolveSafariMushroomFieldInteraction(current, 0, "eat:0");
    assert.equal(result.result, "eat_heal");
    assert.equal(current.player.party[0].hp, 20);
    assert.equal(current.player.party[0].status, "NONE");
  }

  console.log("Safari Mushroom Field playable eat/appraisal routes: PASS");
} finally {
  if (originalPoison) Object.defineProperty(SAFARI_SPECIES_MASTERS, "TESTPOISON", originalPoison);
  else Reflect.deleteProperty(SAFARI_SPECIES_MASTERS, "TESTPOISON");
}
