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

function commitTerminalPlayer(runtime, terminalStateHandoff) {
  const reflected = terminalStateHandoff?.playerParty?.[0];
  if (!reflected || !runtime?.player?.party?.[0]) return;
  runtime.player.party[0] = structuredClone(reflected);
}

export function attemptSafariCapture(runtime) {
  const state = runtime?.variables?.mapless;
  const battle = state?.battle;
  if (!state || !battle || battle.completed || battle.kind !== "wild") {
    throw new Error("active wild battle is required");
  }

  const owner = resolveBrowserWildBattleCommand({
    command: "capture",
    player: runtime?.player?.party?.[0],
    foe: battle.foe,
    trainerBattle: false,
    decision: Number(battle.decision ?? 0),
    postBattlePersistenceInput: postBattlePersistenceInput(runtime),
    reflectedPartyIndex: 0,
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
  // commit only that active slot after routing so newly caught Party members are
  // not replaced by the pre-capture persistence snapshot.
  const applied = applyLegacySafariCaptureState(runtime);
  if (applied.result !== owner.capture.result) {
    throw new Error(`Safari capture adapter diverged from Battle owner: ${applied.result} != ${owner.capture.result}`);
  }
  commitTerminalPlayer(runtime, owner.terminalStateHandoff);
  state.last_terminal_wild = structuredClone(owner.terminalStateHandoff);
  const terminalOperation = { op: "terminal_wild_state_committed", resultKind: owner.terminalStateHandoff?.resultKind ?? "captured" };
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
