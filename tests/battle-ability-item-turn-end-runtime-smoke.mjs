import assert from "node:assert/strict";
import { commitBattleAbilityItemTurnEndRuntime } from "../runtime/battle-ability-item-turn-end-runtime.js";

function pokemon({ ability = "NONE", item = null, hp = 80, maxHp = 160, status = "NONE", types = ["NORMAL"] } = {}) {
  return {
    species: "EEVEE",
    level: 20,
    hp,
    max_hp: maxHp,
    stats: { ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 },
    moves: [{ id: "TACKLE", pp: 35, ppup: 0 }],
    ability,
    held_item: item,
    item,
    status,
    status_count: 0,
    types,
  };
}

{
  const result = commitBattleAbilityItemTurnEndRuntime({ pokemon: pokemon({ item: "LEFTOVERS" }) });
  assert.equal(result.pokemon.hp, 90);
  assert.equal(result.commit.reason, "leftovers");
  assert.equal(result.commit.hpDelta, 10);
}

{
  const result = commitBattleAbilityItemTurnEndRuntime({ pokemon: pokemon({ item: "BLACKSLUDGE", types: ["POISON"], hp: 80 }) });
  assert.equal(result.pokemon.hp, 90);
  assert.equal(result.commit.reason, "black_sludge_heal");
}

{
  const result = commitBattleAbilityItemTurnEndRuntime({ pokemon: pokemon({ item: "BLACKSLUDGE", types: ["NORMAL"], hp: 80 }) });
  assert.equal(result.pokemon.hp, 60);
  assert.equal(result.commit.reason, "black_sludge_damage");
}

{
  const result = commitBattleAbilityItemTurnEndRuntime({ pokemon: pokemon({ ability: "RAINDISH", hp: 80 }), context: { effectiveWeather: "Rain" } });
  assert.equal(result.pokemon.hp, 90);
  assert.equal(result.commit.reason, "rain_dish");
}

{
  const result = commitBattleAbilityItemTurnEndRuntime({ pokemon: pokemon({ ability: "SPEEDBOOST", hp: 100, maxHp: 100 }) });
  assert.deepEqual(result.commit.statChanges, [{ subject: "user", stat: "SPEED", delta: 1 }]);
  assert.equal(result.pokemon.hp, 100);
}

{
  const result = commitBattleAbilityItemTurnEndRuntime({ pokemon: pokemon({ item: "FLAMEORB", hp: 100, maxHp: 100 }) });
  assert.equal(result.pokemon.status, "BURN");
  assert.equal(result.commit.statusChanged, true);
}

{
  const result = commitBattleAbilityItemTurnEndRuntime({ pokemon: pokemon({ item: "TOXICORB", hp: 100, maxHp: 100 }) });
  assert.equal(result.pokemon.status, "POISON");
  assert.equal(result.commit.statusChanged, true);
  assert.equal(result.commit.statusRequest.toxic, true);
}

{
  const p = pokemon({ item: null, hp: 80 });
  p.item = "LEFTOVERS";
  const result = commitBattleAbilityItemTurnEndRuntime({ pokemon: p });
  assert.equal(result.pokemon.hp, 80, "canonical held_item=null must suppress stale legacy item alias");
  assert.equal(result.commit, null);
}

console.log("battle ability/item turn-end runtime smoke: PASS");
