import assert from "node:assert/strict";
import {
  canSafariUseBattleStatBoostItem,
  isSafariBattleStatBoostItem,
  useSafariBattleStatBoostItem,
} from "../runtime/safari-battle-stat-boost-item-use.js";

function runtimeWith(itemId, attackStage = 0) {
  return {
    bag: { slots: [[itemId, 1]] },
    player: {
      party: [{ species: "PIKACHU", nickname: "PIKACHU", hp: 35, max_hp: 35, happiness: 70, steps_to_hatch: 0 }],
    },
    variables: {
      mapless: {
        shop: null,
        last_operations: [],
        notice: "",
        battle: {
          kind: "wild",
          origin: "day_board",
          completed: false,
          player_party_index: 0,
          player_replacement_required: false,
          stat_stages: {
            0: { ATTACK: attackStage, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0, ACCURACY: 0, EVASION: 0 },
            1: { ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0, ACCURACY: 0, EVASION: 0 },
          },
        },
      },
    },
  };
}

assert.equal(isSafariBattleStatBoostItem("XATTACK"), true);
assert.equal(isSafariBattleStatBoostItem("DIREHIT"), false);
assert.equal(isSafariBattleStatBoostItem("GUARDSPEC"), false);

const normal = runtimeWith("XATTACK", 0);
assert.equal(canSafariUseBattleStatBoostItem(normal, { itemId: "XATTACK", partyIndex: 0 }), true);
const used = useSafariBattleStatBoostItem(normal, { itemId: "XATTACK", partyIndex: 0 });
assert.equal(used.used, true);
assert.equal(used.statStageBefore, 0);
assert.equal(used.statStageAfter, 2);
assert.equal(normal.variables.mapless.battle.stat_stages[0].ATTACK, 2);
assert.deepEqual(normal.bag.slots, []);
assert.equal(used.operations.filter((operation) => operation.op === "remove_item").length, 1);

const capped = runtimeWith("XATTACK6", 6);
assert.equal(canSafariUseBattleStatBoostItem(capped, { itemId: "XATTACK6" }), false);
const noEffect = useSafariBattleStatBoostItem(capped, { itemId: "XATTACK6" });
assert.equal(noEffect.used, false);
assert.equal(noEffect.result, "no_effect");
assert.deepEqual(capped.bag.slots, [["XATTACK6", 1]]);

const bench = runtimeWith("XSPEED", 0);
bench.player.party.push({ species: "EEVEE", hp: 20, max_hp: 20, steps_to_hatch: 0 });
const invalidTarget = useSafariBattleStatBoostItem(bench, { itemId: "XSPEED", partyIndex: 1 });
assert.equal(invalidTarget.used, false);
assert.equal(invalidTarget.result, "invalid_target");
assert.deepEqual(bench.bag.slots, [["XSPEED", 1]]);

console.log("safari battle stat boost item smoke: ok");
