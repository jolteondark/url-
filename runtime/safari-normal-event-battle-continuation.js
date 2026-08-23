const continuationResolvers = new Map();

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function normalizedIdentity(input = {}) {
  const boardIndex = Number(input.boardIndex);
  if (!Number.isInteger(boardIndex) || boardIndex < 0) throw new TypeError("normal-event continuation boardIndex must be a non-negative integer");
  const eventId = String(input.eventId ?? "");
  if (!eventId) throw new TypeError("normal-event continuation eventId is required");
  const actionId = String(input.actionId ?? "");
  if (!actionId) throw new TypeError("normal-event continuation actionId is required");
  return { boardIndex, eventId, actionId };
}

function continuationKey(state, identity) {
  return [Number(state.day ?? 0), identity.boardIndex, identity.eventId, identity.actionId].join(":");
}

function assertOriginatingEvent(state, identity) {
  const event = state.board_events?.[identity.boardIndex];
  if (!event || event.kind !== "normal_event") throw new Error("normal-event continuation requires an originating normal_event board cell");
  const actualId = String(event.normal_event_id ?? "");
  if (actualId !== identity.eventId) {
    throw new Error(`normal-event continuation expected ${identity.eventId}, got ${actualId || "unknown"}`);
  }
  if (state.board_consumed?.[identity.boardIndex]) {
    throw new Error("normal-event continuation cannot start from an already consumed cell");
  }
  return event;
}

function pendingOf(state) {
  const pending = state.normal_event_battle_continuation;
  return pending && typeof pending === "object" && !Array.isArray(pending) ? pending : null;
}

export function registerSafariNormalEventBattleContinuation(eventId, resolver) {
  const id = String(eventId ?? "");
  if (!id) throw new TypeError("normal-event continuation eventId is required");
  if (typeof resolver !== "function") throw new TypeError("normal-event continuation resolver must be a function");
  continuationResolvers.set(id, resolver);
  return () => {
    if (continuationResolvers.get(id) === resolver) continuationResolvers.delete(id);
  };
}

export function beginSafariNormalEventBattleContinuation(runtime, input = {}) {
  const state = stateOf(runtime);
  const identity = normalizedIdentity(input);
  assertOriginatingEvent(state, identity);

  const existing = pendingOf(state);
  if (existing?.committed === false) {
    throw new Error(`normal-event battle continuation is already pending: ${existing.key ?? "unknown"}`);
  }

  const checkpoint = {
    key: continuationKey(state, identity),
    day: Number(state.day ?? 0),
    board_index: identity.boardIndex,
    event_id: identity.eventId,
    action_id: identity.actionId,
    request: clone(input.request ?? null),
    payload: clone(input.payload ?? null),
    battle_started: false,
    battle_returned: false,
    resolving: false,
    committed: false,
  };
  state.normal_event_battle_continuation = checkpoint;
  return checkpoint;
}

export function bindSafariNormalEventBattleContinuation(runtime, checkpoint) {
  const state = stateOf(runtime);
  const pending = pendingOf(state);
  if (!pending || pending !== checkpoint || pending.committed !== false) {
    throw new Error("normal-event battle binding requires the active continuation checkpoint");
  }
  const battle = state.battle;
  if (!battle || typeof battle !== "object" || Array.isArray(battle)) {
    throw new Error("normal-event battle binding requires an active Battle owner");
  }
  if (pending.battle_started) {
    if (battle.normal_event_continuation_key === pending.key) return pending;
    throw new Error("normal-event continuation is already bound to another battle");
  }
  battle.origin = "normal_event";
  battle.normal_event_continuation_key = pending.key;
  battle.return_target = battle.return_target ?? "day_board";
  pending.battle_started = true;
  return pending;
}

export function rollbackSafariNormalEventBattleContinuation(runtime, checkpoint) {
  const state = stateOf(runtime);
  const pending = pendingOf(state);
  if (!pending || pending !== checkpoint) return false;
  if (pending.battle_started) throw new Error("started normal-event battle continuation cannot be rolled back by the pre-battle owner");
  state.normal_event_battle_continuation = null;
  return true;
}

export function pendingSafariNormalEventBattleContinuation(runtime) {
  return clone(pendingOf(stateOf(runtime)));
}

export function completeSafariNormalEventBattleContinuation(runtime, battleReturn = {}) {
  const state = stateOf(runtime);
  const checkpoint = pendingOf(state);
  if (!checkpoint) return null;

  if (checkpoint.committed === true) return clone(checkpoint.committed_result ?? null);
  if (checkpoint.resolving === true) {
    throw new Error(`normal-event continuation checkpoint is incomplete and cannot be replayed: ${checkpoint.key ?? "unknown"}`);
  }
  if (checkpoint.battle_started !== true) throw new Error("normal-event continuation cannot complete before Battle start");

  const target = String(battleReturn?.target ?? battleReturn?.summary?.returnTarget ?? "day_board");
  const summary = clone(battleReturn?.summary ?? battleReturn ?? {});
  checkpoint.battle_returned = true;
  checkpoint.battle_return = summary;

  if (target === "home") {
    const result = {
      runtime,
      result: "normal_event_battle_run_end",
      target: "home",
      continuationKey: checkpoint.key,
      operations: clone(battleReturn?.operations ?? []),
      terminal: true,
    };
    checkpoint.resolving = true;
    checkpoint.committed_result = clone(result);
    checkpoint.committed = true;
    checkpoint.resolving = false;
    return result;
  }

  const resolver = continuationResolvers.get(String(checkpoint.event_id));
  if (typeof resolver !== "function") {
    return {
      runtime,
      result: "normal_event_continuation_handler_required",
      continuationKey: checkpoint.key,
      eventId: checkpoint.event_id,
      actionId: checkpoint.action_id,
      battleReturn: summary,
      operations: [],
      terminal: false,
    };
  }

  checkpoint.resolving = true;
  try {
    const resolved = resolver(runtime, {
      key: checkpoint.key,
      day: checkpoint.day,
      boardIndex: checkpoint.board_index,
      eventId: checkpoint.event_id,
      actionId: checkpoint.action_id,
      request: clone(checkpoint.request),
      payload: clone(checkpoint.payload),
      battleReturn: summary,
    });
    if (!resolved || typeof resolved !== "object" || resolved.terminal !== true) {
      throw new Error("normal-event continuation resolver must return a terminal result");
    }
    checkpoint.committed_result = clone(resolved);
    checkpoint.committed = true;
    checkpoint.resolving = false;
    return resolved;
  } catch (error) {
    checkpoint.error_name = error?.name ?? "Error";
    checkpoint.error_message = error?.message ?? String(error);
    throw error;
  }
}
