import assert from "node:assert/strict";
import { RubyMT19937Random } from "../runtime/ruby-mt19937-random.js";
import { generateSafariDynamicTrainer } from "../runtime/mapless-dynamic-trainer-generator.js";
import { createSafariPlayableRuntime, activateSafariDayBoardCell } from "../runtime/safari-playable-integration.js";

const ruby = new RubyMT19937Random(1);
assert.deepEqual(Array.from({ length: 10 }, () => ruby.randInt(3)), [1,0,0,1,1,0,0,1,0,1]);
const ruby30 = new RubyMT19937Random(42);
assert.deepEqual(Array.from({ length: 10 }, () => ruby30.randInt(30)), [6,19,28,14,10,7,28,20,6,25]);

const seeded = generateSafariDynamicTrainer({ day: 21, seed: 123456789 });
assert.deepEqual(seeded, generateSafariDynamicTrainer({ day: 21, seed: 123456789 }));
assert.notDeepEqual(seeded, generateSafariDynamicTrainer({ day: 21, seed: 123456790 }));

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
const trainerIndices = state.board_events.map((event, index) => event.kind === "trainer" ? index : -1).filter((index) => index >= 0);
assert.ok(trainerIndices.length >= 1);
const seeds = trainerIndices.map((index) => state.board_events[index].trainer_seed);
assert.ok(seeds.every((seed) => Number.isInteger(seed) && seed >= 0 && seed <= 0x7fffffff));
assert.equal(new Set(seeds).size, seeds.length);
const index = trainerIndices[0];
const expected = generateSafariDynamicTrainer({ day: state.day, seed: state.board_events[index].trainer_seed });
const started = activateSafariDayBoardCell(runtime, index);
assert.equal(started.result, "dispatched");
assert.equal(state.battle.trainer_seed, expected.seed);
assert.equal(state.battle.trainer.trainer_full_name, expected.trainer_full_name);
assert.deepEqual(state.battle.trainer.species_ids, expected.species_ids);
assert.deepEqual(state.battle.trainer.levels, expected.levels);
console.log(JSON.stringify({ ok: true, seed: expected.seed, trainer: expected.trainer_full_name, species: expected.species_ids, levels: expected.levels }));
