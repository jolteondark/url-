import { resolveCampNextDay } from "./mapless-camp-next-day-flow.js";
import { isBoundaryTrialFloor, resolveBoundaryTrialFlow } from "./mapless-boundary-trial-flow.js";
import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";
import { pokemonMoveTotalPp, setPokemonRuntimeMovePp, updatePokemonRuntime } from "./pokemon-runtime.js";

const PRE_SHUFFLE_KINDS = Object.freeze(["center", "shop", "egg_shop", "wild", "wild", "trainer", "trainer"]);
const GENERATION_DECISIONS = Object.freeze([
  { shuffle_order: [3, 0, 5, 1, 4, 2, 6], next_day_index: 7 },
  { shuffle_order: [6, 4, 1, 3, 0, 5, 2], next_day_index: 2 },
  { shuffle_order: [2, 5, 3, 0, 6, 4, 1], next_day_index: 5 },
  { shuffle_order: [4, 1, 6, 2, 5, 0, 3], next_day_index: 0 },
]);

function generationForDay(day) {
  const decision = GENERATION_DECISIONS[(Math.max(1, Number(day)) - 1) % GENERATION_DECISIONS.length];
  return {
    pre_shuffle_kinds: [...PRE_SHUFFLE_KINDS],
    shuffle_order: [...decision.shuffle_order],
    next_day_index: decision.next_day_index,
  };
}

function pokemonId(pokemon, index) {
  return pokemon?.personal_id ?? pokemon?.id ?? pokemon?.uuid ?? index;
}

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function recoveryAmount(total, percent) {
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(percent) || percent <= 0) return 0;
  return Math.max(1, Math.floor(total * percent / 100));
}

function recoverPokemon(pokemon, index, operation) {
  const watcher = pokemonId(pokemon, index) === operation.watcher_id;
  const hpPercent = watcher ? operation.watcher_hp_percent : operation.normal_hp_percent;
  const ppPercent = watcher ? operation.watcher_pp_percent : operation.normal_pp_percent;
  const maxHp = Number(pokemon.max_hp ?? pokemon.total_hp ?? pokemon.hp ?? 1);
  const hp = Math.min(maxHp, Number(pokemon.hp ?? 0) + recoveryAmount(maxHp, hpPercent));
  let recovered = updatePokemonRuntime(pokemon, { hp });

  for (let moveIndex = 0; moveIndex < recovered.moves.length; moveIndex += 1) {
    const move = recovered.moves[moveIndex];
    const master = SAFARI_MOVE_MASTERS[moveId(move)];
    if (!master || !Number.isInteger(master.total_pp)) continue;
    const ppup = typeof move === "string" ? 0 : Number(move.ppup ?? 0);
    const totalPp = pokemonMoveTotalPp(master.total_pp, Number.isInteger(ppup) && ppup >= 0 ? ppup : 0);
    const currentPp = typeof move === "string" ? totalPp : Number(move.pp ?? totalPp);
    const nextPp = Math.min(totalPp, currentPp + recoveryAmount(totalPp, ppPercent));
    recovered = setPokemonRuntimeMovePp(recovered, moveIndex, nextPp, master.total_pp);
  }
  return recovered;
}

function existingBoundaryInput(state, floor) {
  const prior = state?.boundary_trial && typeof state.boundary_trial === "object"
    ? state.boundary_trial
    : {};
  return {
    floor,
    leader_bag: Array.isArray(prior.leader_bag) ? prior.leader_bag : [],
    last_leader: prior.last_leader ?? null,
    pending_leader: prior.pending_leader ?? null,
    trial_count: Number(prior.trial_count ?? 0),
    trial_started: Boolean(prior.trial_started),
    trial_cleared: Boolean(prior.trial_cleared),
    trial_floor: prior.trial_floor ?? null,
    selected_leader: prior.pending_leader ?? null,
  };
}

export function prepareSafariCampNextDay(runtime, index, confirmed = true) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object") throw new TypeError("runtime variables.mapless state is required");
  if (state.board_events?.[index]?.kind !== "next_day") throw new Error("next_day board event is required");
  const owner = resolveCampNextDay({
    day: state.day,
    selected_index: index,
    confirmed,
    generation: confirmed ? generationForDay(Number(state.day) + 1) : undefined,
    party: runtime?.player?.party ?? [],
  });
  const nextDay = Number(owner?.day_board?.day ?? 0);
  if (!confirmed || !isBoundaryTrialFloor(nextDay)) return owner;
  const boundaryTrial = resolveBoundaryTrialFlow(existingBoundaryInput(state, nextDay));
  return { ...owner, boundary_trial: boundaryTrial };
}

export function applySafariCampRecovery(runtime, ownerResult) {
  const operation = ownerResult?.recovery_operations?.find((entry) => entry.op === "camp_recover_party");
  if (!operation) return runtime;
  runtime.player.party = runtime.player.party.map((pokemon, index) => recoverPokemon(pokemon, index, operation));
  const state = runtime.variables.mapless;
  state.last_operations = [
    ...(Array.isArray(state.last_operations) ? state.last_operations : []),
    { ...operation, owner: "mapless-camp-next-day-flow" },
  ];
  return runtime;
}

export function applySafariBoundaryTrialEntry(runtime, ownerResult) {
  const boundary = ownerResult?.boundary_trial;
  if (!boundary) return { runtime, entered: false, boundary: null };
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object") throw new TypeError("runtime variables.mapless state is required");
  const floor = Number(ownerResult?.day_board?.day ?? boundary?.state?.day ?? state.day);
  state.day = floor;
  state.location = "boundary_trial";
  state.boundary_trial = {
    ...structuredClone(boundary.state),
    result: boundary.result,
    battle_request: structuredClone(boundary.battle_request ?? null),
  };
  state.board_suspended_for_boundary = true;
  state.notice = boundary.result === "leader_required"
    ? `DAY ${floor}：境界の試練。リーダーの選出が必要です。`
    : `DAY ${floor}：境界の試練。`;
  const boundaryOperations = (boundary.operations ?? []).map((operation) => ({
    ...structuredClone(operation),
    owner: "mapless-boundary-trial-flow",
  }));
  state.last_operations = [
    ...(Array.isArray(state.last_operations) ? state.last_operations : []),
    ...boundaryOperations,
  ];
  return { runtime, entered: true, boundary };
}
