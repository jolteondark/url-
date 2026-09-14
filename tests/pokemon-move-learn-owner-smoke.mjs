import assert from "node:assert/strict";
import { commitCanonicalMoveLearnV108 } from "../runtime/mapless-pokemon-move-learn-v108.js";

const base = {
  species:"PIKACHU",
  level:20,
  personal_id:12345,
  moves:["TACKLE", "GROWL", "THUNDERWAVE"],
};

const added = commitCanonicalMoveLearnV108(base, { op:"learn_move", move_id:"THUNDERBOLT" });
assert.equal(added.success, true);
assert.equal(added.result, "move_learned");
assert.deepEqual(added.pokemon.moves, ["TACKLE", "GROWL", "THUNDERWAVE", "THUNDERBOLT"]);
assert.deepEqual(base.moves, ["TACKLE", "GROWL", "THUNDERWAVE"]);

const full = { ...base, moves:["TACKLE", "GROWL", "THUNDERWAVE", "QUICKATTACK"] };
const required = commitCanonicalMoveLearnV108(full, { op:"learn_move", move_id:"THUNDERBOLT" });
assert.equal(required.success, false);
assert.equal(required.result, "move_replacement_required");
assert.deepEqual(required.pokemon.moves, full.moves);
assert.deepEqual(required.replacementChoices, full.moves);

const cancelled = commitCanonicalMoveLearnV108(full, { op:"learn_move", move_id:"THUNDERBOLT", cancelled:true });
assert.equal(cancelled.success, false);
assert.equal(cancelled.result, "move_learn_cancelled");
assert.deepEqual(cancelled.pokemon.moves, full.moves);

const replaced = commitCanonicalMoveLearnV108(full, { op:"learn_move", move_id:"THUNDERBOLT", replacement_index:1 });
assert.equal(replaced.success, true);
assert.equal(replaced.result, "move_replaced");
assert.equal(replaced.replacedMoveId, "GROWL");
assert.deepEqual(replaced.pokemon.moves, ["TACKLE", "THUNDERBOLT", "THUNDERWAVE", "QUICKATTACK"]);
assert.deepEqual(full.moves, ["TACKLE", "GROWL", "THUNDERWAVE", "QUICKATTACK"]);

const duplicate = commitCanonicalMoveLearnV108(full, { op:"learn_move", move_id:"TACKLE" });
assert.equal(duplicate.success, false);
assert.equal(duplicate.result, "move_already_known");
assert.deepEqual(duplicate.pokemon.moves, full.moves);

assert.throws(
  () => commitCanonicalMoveLearnV108(full, { op:"learn_move", move_id:"THUNDERBOLT", replacement_index:4 }),
  /replacement_index/,
);

console.log("pokemon move-learn owner smoke: ok");
