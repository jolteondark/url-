import { resolveBrowserTrainerReplacementContinuation } from "./browser-trainer-replacement-continuation.js";
import { awardSafariTrainerFaintExp } from "./safari-battle-exp-handoff.js";

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function foeFainted(result, battle) {
  if (result?.battleContinuationHandoff?.foeReplacementRequired) return true;
  if (Number(battle?.foe?.hp ?? 1) <= 0) return true;
  return (result?.operations ?? []).some((operation) =>
    (operation?.op === "faint" && operation?.target === "foe") ||
    ((operation?.op === "reduce_hp" || operation?.op === "reduce_self_hp")
      && operation?.target === "foe"
      && Number(operation?.hpAfter) <= 0));
}

function hasTrainerReserve(battle) {
  return battle?.kind === "trainer"
    && Array.isArray(battle.trainer_party)
    && Number.isInteger(battle.trainer_party_index)
    && battle.trainer_party.some((pokemon, index) =>
      index !== battle.trainer_party_index && Number(pokemon?.hp ?? 0) > 0);
}

function legacyPreappliedReplacement(result, battle) {
  const operation = [...(result?.operations ?? [])].reverse().find((entry) =>
    entry?.op === "trainer_send_next" && Number.isInteger(Number(entry?.partyIndex)));
  if (!operation) return null;
  const nextPartyIndex = Number(operation.partyIndex);
  const priorActivePartyIndex = nextPartyIndex - 1;
  if (!Array.isArray(battle?.trainer_party)
    || priorActivePartyIndex < 0
    || priorActivePartyIndex >= battle.trainer_party.length) return null;
  return { priorActivePartyIndex, nextPartyIndex };
}

function ownerHandoff(result, battle, runtime) {
  const exact = result?.battleContinuationHandoff;
  if (exact?.foeReplacementRequired && Array.isArray(exact.foeParty)) return clone(exact);

  const preapplied = legacyPreappliedReplacement(result, battle);
  const party = clone(battle.trainer_party);
  const activeIndex = preapplied?.priorActivePartyIndex ?? Number(battle.trainer_party_index);
  if (party[activeIndex]) party[activeIndex] = { ...party[activeIndex], hp: 0, fainted: true };
  const playerActivePartyIndex = Number.isInteger(Number(battle?.player_party_index))
    ? Number(battle.player_party_index)
    : 0;
  return {
    decision: 0,
    playerParty: clone(runtime?.player?.party ?? []),
    foeParty: party,
    playerActivePartyIndex,
    foeActivePartyIndex: activeIndex,
    playerReplacementRequired: false,
    foeReplacementRequired: true,
  };
}

export function continueSafariTrainerAfterFirstKo(runtime, result = {}) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.kind !== "trainer" || battle.completed) return result;
  if (Number(result?.decision ?? battle.decision ?? 0) !== 0) return result;
  if (!hasTrainerReserve(battle) || !foeFainted(result, battle)) return result;

  const handoff = ownerHandoff(result, battle, runtime);
  const defeatedIndex = Number(handoff.foeActivePartyIndex);
  const defeatedFoe = handoff.foeParty?.[defeatedIndex];
  if (!defeatedFoe) throw new RangeError("defeated trainer Pokemon is missing from the Battle continuation handoff");
  const expResolution = awardSafariTrainerFaintExp(
    runtime,
    battle,
    defeatedFoe,
    handoff.playerActivePartyIndex,
  );
  handoff.playerParty = clone(runtime.player.party);

  const continuation = resolveBrowserTrainerReplacementContinuation({
    battleContinuationHandoff: handoff,
    replacementDecisionInput: {},
    partyOrder: Array.isArray(battle.trainer_party_order) ? battle.trainer_party_order : null,
    idxBattler: 1,
    sideSize: 1,
  });
  if (continuation.result !== "continued_with_replacement") return result;

  battle.trainer_party = clone(continuation.battleContinuationHandoff.foeParty);
  battle.trainer_party_index = Number(continuation.battleContinuationHandoff.foeActivePartyIndex);
  battle.trainer_party_order = clone(continuation.partyOrder ?? battle.trainer_party_order ?? null);
  battle.foe = clone(continuation.activeFoe);
  battle.decision = 0;
  battle.completed = false;
  battle.captured = false;

  const trainerName = battle.trainer?.trainer_full_name ?? "トレーナー";
  const expOperations = clone(expResolution.operations ?? []);
  const switchOperations = clone(continuation.operations ?? []);
  const roundOperations = (result.operations ?? []).filter((operation) => operation?.op !== "trainer_send_next");
  battle.last_operations = [...roundOperations, ...expOperations, ...switchOperations];
  battle.presentation = [
    ...(result.presentation ?? []).filter((event) => event?.type !== "battle_result" && event?.type !== "trainer_next"),
    {
      type: "trainer_next",
      actor: "foe",
      trainer: trainerName,
      species: battle.foe?.species ?? null,
      partyIndex: battle.trainer_party_index,
    },
  ];
  state.last_operations = battle.last_operations;
  state.notice = `${trainerName}は${battle.foe?.species ?? "次のポケモン"}を繰り出した！`;

  return {
    ...result,
    decision: 0,
    trainerReplacementContinuation: continuation,
    trainerFaintExp: expResolution,
    expAwarded: expResolution.expGained,
    replacementApplied: true,
    foeReplacementApplied: true,
    operations: battle.last_operations,
    presentation: battle.presentation,
    persistenceRequested: false,
  };
}
