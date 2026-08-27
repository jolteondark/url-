import assert from "node:assert/strict";
import { RubyMT19937Random } from "../runtime/ruby-mt19937-random.js";
import {
  MAPLESS_V108_LOST_POKEMON_RARE_BERRIES,
  MAPLESS_V108_LOST_POKEMON_UNEVOLVED_STAGES,
  hydrateMaplessV108LostPokemonFixedData,
  maplessV108LostPokemonUnevolvedPool,
  projectMaplessV108LostPokemonEncounter,
  resolveMaplessV108LostPokemonBerryThanks,
  resolveMaplessV108LostPokemonGiftRoll,
} from "../runtime/mapless-v108-lost-pokemon.js";

const seed = 937108;
const expectedGift = new RubyMT19937Random(seed ^ 0x4c4f5354).randInt(100);
assert.equal(resolveMaplessV108LostPokemonGiftRoll(seed), expectedGift);
assert.deepEqual(MAPLESS_V108_LOST_POKEMON_UNEVOLVED_STAGES, [
  "NO_EVOLUTION", "ONE_EVOLUTION_BASE", "TWO_EVOLUTION_BASE",
]);

const pool = maplessV108LostPokemonUnevolvedPool("FIRE");
assert.ok(pool.length > 0);
const expectedSpecies = pool[new RubyMT19937Random(seed).randInt(pool.length)];
const base = { species:"TORKOAL", level:12, form:0, gender:"male", shiny:false, display_sprite:"old" };
const projected = projectMaplessV108LostPokemonEncounter(base, {
  type:"FIRE",
  seed,
  displayProjector:({ species }) => `sprite:${species}`,
});
assert.equal(projected.species, expectedSpecies);
assert.equal(projected.level, 12, "create_unevolved_encounter must preserve the base encounter level");
assert.equal(projected.display_sprite, `sprite:${expectedSpecies}`);
assert.equal(base.species, "TORKOAL", "projection must not mutate the encounter owner input");

let createCalls = 0;
const hydrated = hydrateMaplessV108LostPokemonFixedData(seed, { type:"FIRE" }, {
  createBaseEncounter:({ type, enemyRank, levelAdjustment, seed: encounterSeed }) => {
    createCalls += 1;
    assert.equal(type, "FIRE");
    assert.equal(enemyRank, "NORMAL");
    assert.equal(levelAdjustment, -4);
    assert.equal(encounterSeed, seed);
    return base;
  },
  displayProjector:({ species }) => `sprite:${species}`,
});
assert.equal(createCalls, 1);
assert.equal(hydrated.gift_roll, expectedGift);
assert.equal(hydrated.lost_encounter.species, expectedSpecies);
assert.equal(hydrated.lost_encounter.level, 12);

const replay = hydrateMaplessV108LostPokemonFixedData(seed, hydrated, {
  createBaseEncounter:() => { throw new Error("prepared lost_encounter must not reroll"); },
});
assert.deepEqual(replay, hydrated, "prepared fixed data must replay without rerolling");

const rarePool = MAPLESS_V108_LOST_POKEMON_RARE_BERRIES.slice(0, 3);
const rareRng = new RubyMT19937Random(seed ^ 0x52415245);
const expectedRare = rarePool[rareRng.randInt(rarePool.length)];
assert.deepEqual(
  resolveMaplessV108LostPokemonBerryThanks(seed, 19, (id) => rarePool.includes(id)),
  { kind:"rare_item", items:[expectedRare] },
);
assert.deepEqual(
  resolveMaplessV108LostPokemonBerryThanks(seed, 20, () => true),
  { kind:"shared_small", tier:"small", count:1, items:[] },
);
assert.deepEqual(
  resolveMaplessV108LostPokemonBerryThanks(seed, 0, () => false),
  { kind:"shared_small", tier:"small", count:1, items:[] },
  "empty canonical rare pool must fall back to the existing shared small reward owner",
);

console.log("mapless v0.9.108 Lost Pokemon hydration/rare-thanks smoke: ok");
