import { completeSafariBattlePresentation } from "./safari-battle-orchestrator.js";

function battleOf(runtime) {
  return runtime?.variables?.mapless?.battle ?? null;
}

export function captureSafariBattlePresentationAckSequence(runtime) {
  const checkpoint = battleOf(runtime)?.presentation_checkpoint;
  if (!checkpoint || checkpoint.committed === true) return null;
  const sequence = Number(checkpoint.sequence);
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new Error("battle presentation checkpoint has invalid command sequence");
  }
  return sequence;
}

export function completeSafariBattlePresentationForSequence(runtime, expectedSequence) {
  const battle = battleOf(runtime);
  if (!battle) return null;
  const checkpoint = battle.presentation_checkpoint;
  if (!checkpoint) return completeSafariBattlePresentation(runtime);

  const sequence = Number(expectedSequence);
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new Error("battle presentation acknowledgement requires a captured command sequence");
  }
  if (Number(checkpoint.sequence) !== sequence) {
    throw new Error(
      `stale battle presentation acknowledgement belongs to command sequence ${sequence}; current presentation sequence is ${checkpoint.sequence}`,
    );
  }
  return completeSafariBattlePresentation(runtime);
}
