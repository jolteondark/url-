import { resolveBattleStartCore } from "./battle-core-start-handoff.js";
import { resolveBoundaryTrialFlow } from "./mapless-boundary-trial-flow.js";
import { materializeSafariBoundaryParty3 } from "./safari-boundary-trial-party3.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function randomSeed() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const out = new Uint32Array(1);
    globalThis.crypto.getRandomValues(out);
    return out[0] & 0x7fffffff;
  }
  return Math.floor(Math.random() * 0x80000000) & 0x7fffffff;
}

function boundaryInput(state) {
  const trial = state.boundary_trial ?? {};
  return {
    floor: Number(trial.trial_floor ?? state.day),
    leader_bag: Array.isArray(trial.leader_bag) ? [...trial.leader_bag] : [],
    last_leader: trial.last_leader ?? null,
    pending_leader: trial.pending_leader ?? null,
    selected_leader: trial.pending_leader ?? null,
    trial_count: Number(trial.trial_count ?? 0),
    trial_started: Boolean(trial.trial_started),
    trial_cleared: Boolean(trial.trial_cleared),
    trial_floor: trial.trial_floor ?? state.day,
    preparation_complete: true,
  };
}

export function startSafariBoundaryTrialBattle(runtime) {
  const state = stateOf(runtime);
  if (state.location !== "boundary_trial") throw new Error("boundary trial scene is required");
  if (state.battle && !state.battle.completed) throw new Error("battle is already active");
  const pendingLeader = state.boundary_trial?.pending_leader;
  if (!pendingLeader) throw new Error("pending boundary leader is required");

  const owner = resolveBoundaryTrialFlow(boundaryInput(state));
  if (owner.result !== "battle_requested" || owner.battle_request?.boundary_trial !== true) {
    throw new Error(`boundary owner did not request battle: ${owner.result}`);
  }
  if (Number(owner.battle_request.party_size) !== 3) {
    throw new Error(`Safari boundary Party-3 connector cannot materialize party size ${owner.battle_request.party_size}`);
  }

  const projected = materializeSafariBoundaryParty3({ leaderId: pendingLeader, floor: state.day });
  const party = projected.party.map((pokemon) => structuredClone(pokemon));
  const trainerSeed = randomSeed();
  const trainer = {
    trainer_id: `BOUNDARY_${pendingLeader}_${Number(owner.battle_request.trial_number ?? 1)}`,
    trainer_type: projected.trainer_type,
    trainer_name: projected.trainer_name,
    trainer_full_name: projected.trainer_full_name,
    gender: projected.gender,
    seed: trainerSeed,
    skill_level: projected.skill_level,
    party_size: party.length,
    boundary_trial: true,
  };
  const battleStart = resolveBattleStartCore({
    sendOuts: [[0, runtime.player.party[0]], [1, party[0]]],
  });
  const ownerOperations = (owner.operations ?? []).map((operation) => ({ ...structuredClone(operation), owner: "mapless-boundary-trial-flow" }));
  const lastOperations = [...ownerOperations, ...battleStart.operations];

  state.boundary_trial = {
    ...structuredClone(owner.state),
    result: owner.result,
    battle_request: structuredClone(owner.battle_request),
  };
  state.battle = {
    kind: "trainer",
    origin: "boundary_trial",
    return_target: "day_board",
    board_index: null,
    turn: 1,
    decision: 0,
    completed: false,
    captured: false,
    player_party_index: 0,
    player_party_order: runtime.player.party.map((_, index) => index),
    player_replacement_required: false,
    player_replacement_handoff: null,
    foe: structuredClone(party[0]),
    trainer,
    trainer_party: party,
    trainer_party_index: 0,
    trainer_party_order: party.map((_, index) => index),
    trainer_seed: trainerSeed,
    prize_money: null,
    skill_level: projected.skill_level,
    boundary_trial_request: structuredClone(owner.battle_request),
    last_operations: lastOperations,
    presentation: [{
      type: "battle_started",
      actor: "foe",
      species: party[0].species,
      trainer: trainer.trainer_full_name,
      boundaryTrial: true,
    }],
  };
  state.notice = `境界の向こうから${trainer.trainer_full_name}が現れ、勝負を仕掛けてきた！`;
  state.last_operations = lastOperations;
  return {
    runtime,
    result: "battle_started",
    owner,
    trainer,
    operations: lastOperations,
    presentation: state.battle.presentation,
    persistenceRequested: ownerOperations.some((operation) => operation.op === "autosave_request"),
  };
}
