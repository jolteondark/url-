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
      ownerResolution: owner,
    };
  }

  // The existing Safari adapter still owns Party/Storage routing, Day Board
  // completion and persistence handoff. Its capture calculation uses the same
  // deterministic inputs above; the browser-safe Battle owner is authoritative
  // for whether capture may proceed and for the capture result.
  const applied = applyLegacySafariCaptureState(runtime);
  if (applied.result !== owner.capture.result) {
    throw new Error(`Safari capture adapter diverged from Battle owner: ${applied.result} != ${owner.capture.result}`);
  }
  return {
    ...applied,
    operations: owner.operations.length ? [...owner.operations, ...applied.operations] : applied.operations,
    calculation: owner.capture.capture,
    availability: owner.availability,
    ownerResolution: owner,
  };
}
