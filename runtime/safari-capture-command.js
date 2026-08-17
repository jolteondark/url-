import { resolveBrowserWildBattleCommand } from "./browser-battle-wild-command-handoff.js";
import { SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";
import { attemptSafariCapture as applyLegacySafariCaptureState } from "./safari-playable-integration-wounded.js";

function captureInputForBattle(battle) {
  const species = SAFARI_SPECIES_MASTERS[battle?.foe?.species];
  if (!species) throw new RangeError(`species is outside the Safari projection: ${battle?.foe?.species}`);
  return {
    ball: "POKEBALL",
    gainExpForCapture: false,
    allFaintedAfterCapture: false,
    capture: {
      catchRate: species.catch_rate,
      status: battle.foe.status ?? "NONE",
      ball: "POKEBALL",
      unconditional: false,
      enableCriticalCaptures: false,
      randomValues: [0, 0, 0, 0],
    },
  };
}

function postBattlePersistenceInput(runtime) {
  const party = structuredClone(runtime?.player?.party ?? []);
  return {
    party,
    caught: [],
    initialItems: [party.map((pokemon) => pokemon?.item ?? null), []],
  };
}

function activePartyIndex(battle, runtime) {
  const index = Number(battle?.player_party_index ?? 0);
  if (!Number.isInteger(index) || index < 0 || index >= (runtime?.player?.party?.length ?? 0)) {
    throw new RangeError("active player party index is outside the current Party");
  }
  return index;
}

function commitTerminalPlayer(runtime, terminalStateHandoff, partyIndex) {
  const reflected = terminalStateHandoff?.playerParty?.[partyIndex];
  if (!reflected || !runtime?.player?.party?.[partyIndex]) return;
  runtime.player.party[partyIndex] = structuredClone(reflected);
}

export function attemptSafariCapture(runtime) {
  const state = runtime?.variables?.mapless;
  const battle = state?.battle;
  if (!state || !battle || battle.completed || battle.kind !== "wild") {
    throw new Error("active wild battle is required");
  }

  const playerPartyIndex = activePartyIndex(battle, runtime);
  const player = runtime?.player?.party?.[playerPartyIndex];
  const owner = resolveBrowserWildBattleCommand({
    command: "capture",
    player,
    foe: battle.foe,
    trainerBattle: false,
    decision: Number(battle.decision ?? 0),
    postBattlePersistenceInput: postBattlePersistenceInput(runtime),
    reflectedPartyIndex: playerPartyIndex,
    captureInput: captureInputForBattle(battle),
  });

  if (!owner.availability.canCapture) {
    state.notice = "この相手は捕獲できません。";
    battle.last_operations = owner.operations;
    state.last_operations = owner.operations;
    return {
      runtime,
      result: "blocked",
      operations: owner.operations,
      presentation: [],
      calculation: owner.capture?.capture ?? null,
      availability: owner.availability,
      terminalStateHandoff: owner.terminalStateHandoff,
      ownerResolution: owner,
    };
  }

  if (owner.capture.result !== "caught") {
    state.notice = "捕獲結果: " + owner.capture.result;
    battle.last_operations = owner.operations;
    state.last_operations = owner.operations;
    return {
      runtime,
      result: owner.capture.result,
      operations: owner.operations,
      presentation: [],
      calculation: owner.capture.capture,
      availability: owner.availability,
      terminalStateHandoff: owner.terminalStateHandoff,
      ownerResolution: owner,
    };
  }

  // Party/Storage routing and Day Board completion remain owned by the existing
  // Safari adapter. The Battle owner now supplies the terminal player snapshot;
  // commit only the active slot after routing so newly caught Party members are
  // not replaced by the pre-capture persistence snapshot.
  const applied = applyLegacySafariCaptureState(runtime);
  if (applied.result !== owner.capture.result) {
    throw new Error(`Safari capture adapter diverged from Battle owner: ${applied.result} != ${owner.capture.result}`);
  }
  commitTerminalPlayer(runtime, owner.terminalStateHandoff, playerPartyIndex);
  state.last_terminal_wild = structuredClone(owner.terminalStateHandoff);
  const terminalOperation = { op: "terminal_wild_state_committed", resultKind: owner.terminalStateHandoff?.resultKind ?? "captured", playerPartyIndex };
  state.last_operations = [...owner.operations, ...(applied.operations ?? []), terminalOperation];
  return {
    ...applied,
    operations: state.last_operations,
    calculation: owner.capture.capture,
    availability: owner.availability,
    terminalStateHandoff: owner.terminalStateHandoff,
    ownerResolution: owner,
  };
}
