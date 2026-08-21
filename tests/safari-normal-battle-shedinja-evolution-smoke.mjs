import assert from "node:assert/strict";
import { commitSafariNormalLevelEvolutionRewardGrowth } from "../runtime/safari-normal-battle-finalize.js";
import { SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS } from "../runtime/safari-playable-data.js";

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };

const synthetic = {
  NINCADA: {
    id: "NINCADA", form: 0, growth_rate: "Erratic",
    base_stats: { HP: 31, ATTACK: 45, DEFENSE: 90, SPECIAL_ATTACK: 30, SPECIAL_DEFENSE: 30, SPEED: 40 },
    abilities: ["COMPOUNDEYES"], hidden_abilities: ["RUNAWAY"], gender_ratio: "Female50Percent",
    level_moves: [],
    evolutions: [["NINJASK", "Ninjask", 20, false], ["SHEDINJA", "Shedinja", 20, false]],
  },
  NINJASK: {
    id: "NINJASK", form: 0, growth_rate: "Erratic",
    base_stats: { HP: 61, ATTACK: 90, DEFENSE: 45, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 160 },
    abilities: ["SPEEDBOOST"], hidden_abilities: ["INFILTRATOR"], gender_ratio: "Female50Percent",
    level_moves: [], evolutions: [["NINCADA", "Ninjask", 20, true]],
  },
  SHEDINJA: {
    id: "SHEDINJA", form: 0, growth_rate: "Erratic",
    base_stats: { HP: 1, ATTACK: 90, DEFENSE: 45, SPECIAL_ATTACK: 30, SPECIAL_DEFENSE: 30, SPEED: 40 },
    abilities: ["WONDERGUARD"], hidden_abilities: [], gender_ratio: "Genderless",
    level_moves: [], evolutions: [],
  },
};

const priorSpecies = new Map(Object.keys(synthetic).map((id) => [id, Object.getOwnPropertyDescriptor(SAFARI_SPECIES_MASTERS, id)]));
const priorMove = Object.getOwnPropertyDescriptor(SAFARI_MOVE_MASTERS, "SCRATCH");
for (const [id, master] of Object.entries(synthetic)) {
  Object.defineProperty(SAFARI_SPECIES_MASTERS, id, { configurable: true, enumerable: true, writable: true, value: master });
}
Object.defineProperty(SAFARI_MOVE_MASTERS, "SCRATCH", {
  configurable: true, enumerable: true, writable: true, value: { id: "SCRATCH", total_pp: 35, type: "NORMAL" },
});

try {
  const nincada = {
    species: "NINCADA", form: 0, level: 20, exp: 12800,
    hp: 7, max_hp: 42,
    stats: { ATTACK: 25, DEFENSE: 42, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 24 },
    personal_id: 24681012, gender: 1,
    nature_id: "HARDY", nature_for_stats_id: "HARDY",
    ability_index: 0, ability: "COMPOUNDEYES", ability_id: "COMPOUNDEYES",
    item: "ORANBERRY", held_item: "ORANBERRY",
    status: "POISON", status_count: 2,
    iv: zeroStats,
    iv_maxed: { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false },
    ev: zeroStats,
    moves: [{ id: "SCRATCH", pp: 3, ppup: 0 }],
    poke_ball: "GREATBALL", markings: [1], ribbons: ["COOLRIBBON"],
    __battle_level_evolution_pending: true,
  };
  const runtime = {
    player: { party: [nincada] },
    bag: { slots: [["POKEBALL", 2], ["POTION", 1]], money: 0 },
    variables: { mapless: { battle: { decision: 1, last_operations: [], presentation: [] } } },
  };
  const result = commitSafariNormalLevelEvolutionRewardGrowth(runtime, { operations: [], presentation: [] });

  assert.equal(runtime.player.party.length, 2, "successful Ninjask evolution with room and a Poke Ball must create Shedinja");
  const ninjask = runtime.player.party[0];
  const shedinja = runtime.player.party[1];
  assert.equal(ninjask.species, "NINJASK");
  assert.equal(ninjask.personal_id, nincada.personal_id);
  assert.equal(ninjask.held_item, "ORANBERRY", "primary evolution must retain its held item");
  assert.equal(ninjask.status, "POISON", "primary evolution must retain non-fainted status");
  assert.equal(ninjask.moves[0].pp, 3, "primary evolution must retain current PP");
  assert.equal(shedinja.species, "SHEDINJA");
  assert.equal(shedinja.personal_id, nincada.personal_id, "duplicate follows Essentials clone identity");
  assert.equal(shedinja.max_hp, 1);
  assert.equal(shedinja.hp, 1);
  assert.equal(shedinja.ability, "WONDERGUARD");
  assert.equal(shedinja.held_item, null);
  assert.equal(shedinja.item, null);
  assert.equal(shedinja.status, null);
  assert.equal(shedinja.moves[0].pp, 35, "the duplicate is healed without restoring PP on Ninjask");
  assert.equal(runtime.bag.slots[0][0], "POKEBALL");
  assert.equal(runtime.bag.slots[0][1], 1);
  assert.ok(result.operations.some((operation) => operation.op === "shedinja_duplicate"));
  const unsupported = result.operations.find((operation) => operation.op === "unsupported_evolution_methods");
  assert.ok(!unsupported?.methods?.includes("Shedinja"), "implemented after-evolution hook must not remain unsupported");
} finally {
  for (const [id, descriptor] of priorSpecies) {
    if (descriptor) Object.defineProperty(SAFARI_SPECIES_MASTERS, id, descriptor);
    else Reflect.deleteProperty(SAFARI_SPECIES_MASTERS, id);
  }
  if (priorMove) Object.defineProperty(SAFARI_MOVE_MASTERS, "SCRATCH", priorMove);
  else Reflect.deleteProperty(SAFARI_MOVE_MASTERS, "SCRATCH");
}

console.log("Safari normal Battle Shedinja evolution smoke: PASS");
