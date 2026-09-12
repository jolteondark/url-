import assert from "node:assert/strict";
import { quantity } from "../runtime/bag-economy-mart-flow.js";
import { resolveSafariNewPokemonCreationContextV108 } from "../runtime/safari-new-pokemon-creation-context-v108.js";
import { resolveSafariWoundedPokemonDecision } from "../runtime/safari-wounded-pokemon-integration.js";

function runtimeWithWounded({ species = null, playerId = 0x00050001 } = {}) {
  return {
    player: { id: playerId, party: [{ species: "EEVEE", hp: 10 }] },
    variables: {
      mapless: {
        day: 1,
        board_events: Array.from({ length: 8 }, (_, index) => index === 2
          ? {
            kind: "normal_event",
            normal_event_id: "wounded_pokemon",
            normal_seed: 1,
            normal_data: species ? { species } : {},
          }
          : { kind: "center" }),
        board_revealed: Array(8).fill(false),
        board_consumed: Array(8).fill(false),
        last_operations: [],
      },
    },
    bag: { slots: [["POTION", 1]], money: 0 },
  };
}

const draws = [1, 2, 3, 4, 5, 6, 13, 7];
let drawIndex = 0;
const runtime = runtimeWithWounded();
const result = resolveSafariWoundedPokemonDecision(runtime, 2, {
  choice: "treat",
  itemId: "POTION",
  randomInt(limit) {
    const value = draws[drawIndex++];
    assert.ok(value >= 0 && value < limit);
    return value;
  },
});

assert.equal(drawIndex, 8, "Pokemon.new-equivalent global RNG draws must remain caller-owned");
assert.equal(result.outcome, "joined");
assert.equal(result.joinedPokemon.species, "NINETALES");
assert.equal(result.joinedPokemon.level, 5);
assert.equal(result.joinedPokemon.personal_id, 4282876139);
assert.ok(result.joinedPokemon.hp > 1, "healing must start from the M0391 HP=1 materialization");
assert.equal(runtime.player.party.length, 2);
assert.equal(runtime.player.party[1].personal_id, 4282876139);
assert.equal(quantity(runtime.bag.slots, "POTION"), 0, "successful treatment consumes exactly one item");
assert.equal(runtime.variables.mapless.board_consumed[2], true);
assert.equal(runtime.variables.mapless.board_events[2].normal_resolved, true);
assert.equal(runtime.variables.mapless.board_events[2].normal_data.personal_id, 4282876139);
assert.ok(runtime.variables.mapless.last_operations.some((operation) => operation.op === "party_add"));
assert.ok(runtime.variables.mapless.last_operations.some((operation) => operation.op === "request_save"));
assert.equal(result.persistenceRequested, true);

const retryRuntime = runtimeWithWounded();
let retryDrawIndex = 0;
const first = resolveSafariWoundedPokemonDecision(retryRuntime, 2, {
  choice: "treat",
  itemId: "NOT_AN_ITEM",
  randomInt(limit) {
    const value = draws[retryDrawIndex++];
    assert.ok(value >= 0 && value < limit);
    return value;
  },
});
assert.equal(first.outcome, "no_healing_item");
assert.equal(retryRuntime.variables.mapless.board_consumed[2], false);
assert.equal(quantity(retryRuntime.bag.slots, "POTION"), 1);

const second = resolveSafariWoundedPokemonDecision(retryRuntime, 2, {
  choice: "treat",
  itemId: "POTION",
});
assert.equal(second.outcome, "joined", "prepared snapshot must materialize again without rerolling Pokemon.new");
assert.equal(second.joinedPokemon.personal_id, 4282876139);
assert.equal(quantity(retryRuntime.bag.slots, "POTION"), 0);

function expectedLycanrocForm(context) {
  if (context.dayNight === "EVENING") return 2;
  if (context.dayNight === "NIGHT") return 1;
  return 0;
}

function assertFormSensitiveRescue(species, expectedForm) {
  const formRuntime = runtimeWithWounded({ species });
  const creationFormContext = resolveSafariNewPokemonCreationContextV108(formRuntime);
  const formDraws = [...draws];
  let formDrawIndex = 0;
  const formResult = resolveSafariWoundedPokemonDecision(formRuntime, 2, {
    choice: "treat",
    itemId: "POTION",
    creationFormContext,
    randomInt(limit) {
      const value = formDraws[formDrawIndex++];
      assert.ok(value >= 0 && value < limit);
      return value;
    },
  });

  const resolvedExpectedForm = typeof expectedForm === "function" ? expectedForm(creationFormContext) : expectedForm;
  assert.equal(formDrawIndex, 8, `${species} must preserve caller-owned Pokemon.new RNG draws`);
  assert.equal(formResult.outcome, "joined");
  assert.equal(formResult.joinedPokemon.species, species);
  assert.equal(formResult.joinedPokemon.form, resolvedExpectedForm, `${species} must keep its canonical creation form through treatment`);
  assert.equal(formRuntime.player.party.length, 2);
  assert.equal(formRuntime.player.party[1].species, species);
  assert.equal(formRuntime.player.party[1].form, resolvedExpectedForm, `${species} Party routing must preserve the resolved form`);
  assert.equal(quantity(formRuntime.bag.slots, "POTION"), 0, `${species} treatment must consume exactly one Potion`);
  assert.equal(formRuntime.variables.mapless.board_consumed[2], true);
  assert.equal(formRuntime.variables.mapless.board_events[2].normal_resolved, true);
  assert.equal(formRuntime.variables.mapless.board_events[2].normal_data.pokemon_data.form, resolvedExpectedForm);
  assert.equal(formRuntime.variables.mapless.last_operations.filter((operation) => operation.op === "party_add").length, 1);
  assert.equal(formRuntime.variables.mapless.last_operations.filter((operation) => operation.op === "request_save").length, 1, `${species} must request persistence exactly once`);
  assert.equal(formResult.persistenceRequested, true);
}

assertFormSensitiveRescue("BURMY", 2);
assertFormSensitiveRescue("VIVILLON", 5);
assertFormSensitiveRescue("LYCANROC", expectedLycanrocForm);

console.log("safari-wounded-live-smoke: ok");
