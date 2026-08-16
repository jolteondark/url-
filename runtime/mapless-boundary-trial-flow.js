const TRIAL_INTERVAL = 10;

function partySizeForTrial(trialNumber) {
  const n = Math.max(1, Number.parseInt(trialNumber, 10) || 1);
  if (n <= 3) return 3;
  if (n <= 7) return 4;
  if (n <= 12) return 5;
  return 6;
}

function cloneState(input) {
  return {
    day: Math.max(1, Number.parseInt(input.floor ?? input.day, 10) || 1),
    leader_bag: Array.isArray(input.leader_bag) ? [...input.leader_bag] : [],
    last_leader: input.last_leader ?? null,
    pending_leader: input.pending_leader ?? null,
    trial_count: Math.max(0, Number.parseInt(input.trial_count, 10) || 0),
    trial_started: Boolean(input.trial_started),
    trial_cleared: Boolean(input.trial_cleared),
    trial_floor: input.trial_floor == null ? null : Math.max(1, Number.parseInt(input.trial_floor, 10) || 1),
  };
}

export function isBoundaryTrialFloor(floor) {
  const value = Number.parseInt(floor, 10) || 0;
  return value > 0 && value % TRIAL_INTERVAL === 0;
}

export function resolveBoundaryTrialFlow(input = {}) {
  const state = cloneState(input);
  const operations = [{ op: "clear_board_state" }];
  if (!isBoundaryTrialFloor(state.day)) {
    return { state, operations: [], result: "not_trial_floor", battle_request: null, board_return: null };
  }

  if (state.trial_cleared) {
    const nextDay = state.day + 1;
    operations.push({ op: "advance_floor", from: state.day, to: nextDay });
    operations.push({ op: "clear_day_limited_effects_request" });
    operations.push({ op: "generate_board_request", day: nextDay, resolved: input.post_victory_board ?? null });
    operations.push({ op: "autosave_request", reason: "next normal floor generated" });
    state.day = nextDay;
    return { state, operations, result: "returned_to_board", battle_request: null, board_return: input.post_victory_board ?? null };
  }

  if (!state.pending_leader) {
    state.pending_leader = input.selected_leader ?? null;
    state.trial_floor = state.day;
    if (!state.pending_leader) {
      operations.push({ op: "ensure_pending_leader_request", floor: state.day });
      return { state, operations, result: "leader_required", battle_request: null, board_return: null };
    }
    operations.push({ op: "set_pending_leader", leader: state.pending_leader, floor: state.day });
    operations.push({ op: "autosave_request", reason: "leader selected" });
  }

  const trialNumber = state.trial_count + 1;
  const partySize = partySizeForTrial(trialNumber);
  if (!state.trial_started) {
    operations.push({ op: "preparation_request", unavoidable: true });
    if (input.preparation_complete !== true) {
      return { state, operations, result: "preparation_required", battle_request: null, board_return: null };
    }
    state.trial_started = true;
    operations.push({ op: "set_trial_started", value: true });
    operations.push({ op: "autosave_request", reason: "immediately before trial" });
  }

  const battleRequest = {
    kind: "trainer",
    boundary_trial: true,
    leader: state.pending_leader,
    floor: state.day,
    trial_number: trialNumber,
    party_size: partySize,
    rules: ["canLose", "cannotRun"],
  };
  operations.push({ op: "battle_request", request: battleRequest });

  if (input.battle_outcome == null) {
    return { state, operations, result: "battle_requested", battle_request: battleRequest, board_return: null };
  }

  if (Number(input.battle_outcome) === 1) {
    const leader = state.pending_leader;
    state.last_leader = leader;
    state.pending_leader = null;
    state.trial_count += 1;
    state.trial_started = false;
    state.trial_cleared = true;
    operations.push({ op: "set_trial_victory", leader, trial_count: state.trial_count });
    operations.push({ op: "heal_party_request", scope: "first_six" });
    operations.push({ op: "autosave_request", reason: "trial victory" });
    const nextDay = state.day + 1;
    operations.push({ op: "advance_floor", from: state.day, to: nextDay });
    operations.push({ op: "clear_board_state" });
    operations.push({ op: "clear_day_limited_effects_request" });
    operations.push({ op: "generate_board_request", day: nextDay, resolved: input.post_victory_board ?? null });
    operations.push({ op: "autosave_request", reason: "next normal floor generated" });
    state.day = nextDay;
    return { state, operations, result: "victory_returned_to_board", battle_request: battleRequest, board_return: input.post_victory_board ?? null };
  }

  if (input.run_end_pending === true) {
    operations.push({ op: "run_end_handoff" });
    return { state, operations, result: "run_end_pending", battle_request: battleRequest, board_return: null };
  }

  state.trial_started = false;
  operations.push({ op: "set_trial_started", value: false });
  operations.push({ op: "autosave_request", reason: "trial unresolved" });
  return { state, operations, result: "trial_unresolved", battle_request: battleRequest, board_return: null };
}
