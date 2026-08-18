import assert from "node:assert/strict";
import fs from "node:fs";
import { materializeSeededAccuracyDamageCanonical } from "../runtime/battle-core-seeded-accuracy-damage.js";
import { SAFARI_MOVE_MASTERS } from "../runtime/safari-playable-data.js";
import { createSafariPlayableRuntime } from "../runtime/safari-web-startup.js";
import { resolveSafariNormalBattleRound } from "../runtime/safari-normal-battle-round.js";

const facade = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");
const round = fs.readFileSync(new URL("../runtime/safari-normal-battle-round.js", import.meta.url), "utf8");
const lifecycle = fs.readFileSync(new URL("../runtime/safari-normal-battle-lifecycle.js", import.meta.url), "utf8");
const finalizer = fs.readFileSync(new URL("../runtime/safari-normal-battle-finalize.js", import.meta.url), "utf8");

assert.match(facade, /import \{ activateSafariWebCombatCell \} from "\.\/safari-web-combat-start\.js";/,
  "ordinary Board combat start must be bound before the user taps a cell");
assert.doesNotMatch(facade, /import\("\.\/safari-web-combat-start\.js/,
  "ordinary Board combat tap must not trigger a combat-start module import");
assert.match(facade, /import \{ resolveSafariNormalBattleRound \} from "\.\/safari-normal-battle-round\.js";/,
  "ordinary Battle round owner must be bound during facade module evaluation");
assert.match(facade, /from "\.\/safari-normal-battle-lifecycle\.js";/,
  "ordinary Battle lifecycle owner must be bound during facade module evaluation");
assert.doesNotMatch(facade, /import\("\.\/safari-normal-battle-round\.js/,
  "ordinary first command must not trigger a dynamic round-module import");
assert.doesNotMatch(facade, /import\("\.\/safari-normal-battle-lifecycle\.js/,
  "ordinary capture/return must not trigger a dynamic lifecycle import");
assert.doesNotMatch(facade, /safari-playable-integration-pre-wounded\.js/,
  "ordinary Battle must not re-enter the migration/content chain");
assert.match(facade, /resolveSafariNormalBattleRound\(runtime, selectedMoveId\)/);
assert.match(round, /resolveBrowserBattleRound/);
assert.match(round, /resolveBrowserTrainerBattleRound/);
assert.match(round, /resolveBrowserOpponentMoveChoiceCanonical/);
assert.doesNotMatch(round, /safari-playable-integration-(?:base|core|legacy|pre-wounded|wounded|boundary)/);
assert.doesNotMatch(round, /playerRandomRoll\s*:\s*0/,
  "direct normal Battle must not override the canonical seeded player accuracy roll with zero");
assert.doesNotMatch(round, /foeRandomRoll\s*:\s*0/,
  "direct normal Battle must not override the canonical seeded foe accuracy roll with zero");
const seededAccuracy = materializeSeededAccuracyDamageCanonical({
  combatRandomSeed: 1,
  rounds: [{ actions: [{ kind: "move", accuracyInput: { baseAccuracy: 100 } }] }],
});
assert.equal(seededAccuracy.rounds[0].actions[0].accuracyInput.randomRoll, 37,
  "missing direct-owner accuracy rolls must remain owned by the Ruby-compatible seeded Battle Core RNG");
assert.match(lifecycle, /resolveCaptureFlow/);
assert.match(lifecycle, /routeCaughtQueueToPartyStorage/);
assert.match(lifecycle, /resolveDayBoardPlayableTurn/);
assert.match(finalizer, /resolveDayBoardPlayableTurn/);
assert.match(finalizer, /resolveExpLevelMoveFlow/);
assert.match(finalizer, /trainer_prize_money/);
assert.match(finalizer, /givePotion/);

const STATUS_TEST_MOVE = "STATUS_TEST_MOVE";
SAFARI_MOVE_MASTERS[STATUS_TEST_MOVE] = Object.freeze({
  id: STATUS_TEST_MOVE,
  name: "Status Test Move",
  category: "Status",
  power: 0,
  accuracy: 100,
  total_pp: 20,
  priority: 0,
  type: "NORMAL",
  thaws_user: false,
});

function preparedPokemon(runtime, species, move) {
  const pokemon = structuredClone(runtime.player.party[0]);
  pokemon.species = species;
  pokemon.level = Math.max(5, Number(pokemon.level ?? 5));
  pokemon.max_hp = 999;
  pokemon.hp = 999;
  pokemon.stats = {
    ...pokemon.stats,
    ATTACK: 1,
    SPECIAL_ATTACK: 1,
    DEFENSE: 999,
    SPECIAL_DEFENSE: 999,
    SPEED: Number(pokemon.stats?.SPEED ?? 50),
  };
  pokemon.moves = [{ id: move, pp: 20, ppup: 0 }];
  return pokemon;
}

function statusRuntime(kind) {
  const runtime = createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  const player = preparedPokemon(runtime, "EEVEE", STATUS_TEST_MOVE);
  const foe = preparedPokemon(runtime, "RATTATA", "TACKLE");
  runtime.player.party = [player];
  state.battle = {
    kind,
    origin: "day_board",
    completed: false,
    decision: 0,
    turn: 1,
    board_index: 0,
    player_party_index: 0,
    player_party_order: [0],
    foe: structuredClone(foe),
    ...(kind === "trainer" ? {
      trainer_seed: 12345,
      trainer_party: [structuredClone(foe)],
      trainer_party_index: 0,
      trainer_party_order: [0],
      trainer_flags: [],
      skill_level: 0,
      trainer: { trainer_full_name: "Status Tester" },
      prize_money: 0,
    } : {}),
  };
  return runtime;
}

for (const kind of ["wild", "trainer"]) {
  const runtime = statusRuntime(kind);
  const battle = runtime.variables.mapless.battle;
  const foeHpBefore = Number(battle.foe.hp);
  const resolved = resolveSafariNormalBattleRound(runtime, STATUS_TEST_MOVE);
  assert.equal(resolved.decision, 0, `${kind} Status move regression must remain nonterminal`);
  assert.equal(Number(battle.foe.hp), foeHpBefore, `${kind} direct-normal Status category must never reduce foe HP`);
  assert.ok(!resolved.operations.some((operation) => operation.actor === "player" && operation.op === "reduce_hp"),
    `${kind} Status move must not emit player damage application`);
}

delete SAFARI_MOVE_MASTERS[STATUS_TEST_MOVE];

console.log("Safari normal Board start/round/lifecycle are direct owners; seeded accuracy and Status no-damage are guarded: ok");
