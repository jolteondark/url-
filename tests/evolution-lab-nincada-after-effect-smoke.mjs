import assert from "node:assert/strict";
import { resolveCanonicalNincadaAfterEvolutionV108 } from "../runtime/mapless-nincada-after-evolution-v108.js";

const ZERO={ HP:0, ATTACK:0, DEFENSE:0, SPECIAL_ATTACK:0, SPECIAL_DEFENSE:0, SPEED:0 };
const nincada={
  species:"NINCADA",
  level:20,
  personal_id:123,
  gender:0,
  form:0,
  moves:[{ id:"SCRATCH", pp:12, ppup:0 }],
  exp:8000,
  hp:1,
  status:"POISON",
  status_count:0,
  item:"ORANBERRY",
  ability_id:"COMPOUNDEYES",
  ability_index:0,
  nature_id:"HARDY",
  nature_for_stats_id:"HARDY",
  nickname:"Needle",
  markings:[1,2],
  poke_ball:"GREATBALL",
  ribbons:["COOLRIBBON"],
  ready_to_evolve:true,
  iv:{...ZERO},
  ev:{...ZERO},
  max_hp:30,
  stats:{ ATTACK:20, DEFENSE:20, SPECIAL_ATTACK:15, SPECIAL_DEFENSE:15, SPEED:25 },
};

const noBall=resolveCanonicalNincadaAfterEvolutionV108({pokemon:nincada,partyLength:1,hasPokeBall:false});
assert.equal(noBall.success,true);
assert.equal(noBall.result,"poke_ball_missing");
assert.equal(noBall.duplicate,null);
assert.equal(noBall.sourceContextPatch.after_evolution_effect_owner_ready,true);

const full=resolveCanonicalNincadaAfterEvolutionV108({pokemon:nincada,partyLength:6,hasPokeBall:true});
assert.equal(full.success,true);
assert.equal(full.result,"party_full");
assert.equal(full.duplicate,null);

const duplicate=resolveCanonicalNincadaAfterEvolutionV108({pokemon:nincada,partyLength:1,hasPokeBall:true});
assert.equal(duplicate.success,true);
assert.equal(duplicate.result,"shedinja_duplicate_ready");
assert.equal(duplicate.consumePokeBall,true);
assert.equal(duplicate.duplicate.species,"SHEDINJA");
assert.equal(duplicate.duplicate.nickname,null);
assert.deepEqual(duplicate.duplicate.markings,[]);
assert.equal(duplicate.duplicate.poke_ball,"POKEBALL");
assert.equal(duplicate.duplicate.item,null);
assert.deepEqual(duplicate.duplicate.ribbons,[]);
assert.equal(duplicate.duplicate.status,"NONE");
assert.equal(duplicate.duplicate.status_count,0);
assert.equal(duplicate.duplicate.hp,duplicate.duplicate.max_hp);
assert.equal(duplicate.duplicate.ready_to_evolve,false);

console.log("evolution-lab-nincada-after-effect-smoke: ok");
