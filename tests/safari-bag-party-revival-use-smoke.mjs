import assert from "node:assert/strict";
import {
  canSafariBagUsePartyRevivalItem,
  useSafariBagPartyRevivalItem,
} from "../runtime/safari-bag-party-revival-use.js";

function makeRuntime() {
  return {
    variables: { mapless: { battle: null, shop: null, last_operations: [], notice: "" } },
    bag: { slots: [["SACREDASH", 2]] },
    player: {
      party: [
        {
          species: "PIKACHU",
          nickname: "ピカチュウ",
          hp: 0,
          max_hp: 101,
          status: "POISON",
          status_count: 2,
          steps_to_hatch: 0,
          moves: [{ id: "TACKLE", pp: 0, ppup: 0 }],
        },
        {
          species: "EEVEE",
          nickname: "イーブイ",
          hp: 20,
          max_hp: 100,
          status: "BURN",
          status_count: 0,
          steps_to_hatch: 0,
          moves: [{ id: "TACKLE", pp: 1, ppup: 0 }],
        },
      ],
    },
  };
}

const runtime = makeRuntime();
assert.equal(canSafariBagUsePartyRevivalItem(runtime, "SACREDASH"), true);
const result = useSafariBagPartyRevivalItem(runtime, { itemId: "SACREDASH" });
assert.equal(result.used, true);
assert.equal(result.persistenceRequested, true);
assert.equal(runtime.player.party[0].hp, 101);
assert.equal(runtime.player.party[0].status, null);
assert.equal(runtime.player.party[0].moves[0].pp > 0, true);
assert.equal(runtime.player.party[1].hp, 20);
assert.equal(runtime.player.party[1].status, "BURN");
assert.deepEqual(runtime.bag.slots, [["SACREDASH", 1]]);
assert.equal(result.operations.at(-1).op, "request_save");
assert.equal(canSafariBagUsePartyRevivalItem(runtime, "SACREDASH"), false);

const noEffect = makeRuntime();
noEffect.player.party[0].hp = 50;
const noEffectResult = useSafariBagPartyRevivalItem(noEffect, { itemId: "SACREDASH" });
assert.equal(noEffectResult.used, false);
assert.equal(noEffectResult.result, "no_effect");
assert.deepEqual(noEffect.bag.slots, [["SACREDASH", 2]]);

const battle = makeRuntime();
battle.variables.mapless.battle = { completed: false };
assert.equal(canSafariBagUsePartyRevivalItem(battle, "SACREDASH"), false);
assert.equal(useSafariBagPartyRevivalItem(battle, { itemId: "SACREDASH" }).result, "battle_active");

console.log("safari bag party revival use smoke: ok");
