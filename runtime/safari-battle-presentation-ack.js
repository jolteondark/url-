import { completeSafariBattlePresentation } from "./safari-battle-orchestrator.js";

function battleOf(runtime) {
  return runtime?.variables?.mapless?.battle ?? null;
}

export function captureSafariBattlePresentationAckSequence(runtime) {
  const battle = battleOf(runtime);
  const checkpoint = battle?.presentation_checkpoint;
  if (!checkpoint || checkpoint.committed === true) return null;
  const sequence = Number(checkpoint.sequence);
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new Error("battle presentation checkpoint has invalid command sequence");
  }
  return Object.freeze({ battle, checkpoint, sequence });
}

export function completeSafariBattlePresentationForSequence(runtime, expectedSequence) {
  const battle = battleOf(runtime);
  if (!battle) return null;
  if (!expectedSequence || typeof expectedSequence !== "object") {
    throw new Error("battle presentation acknowledgement requires a captured command sequence token");
  }
  if (expectedSequence.battle !== battle) {
    throw new Error("stale battle presentation acknowledgement belongs to a different battle instance");
  }

  const sequence = Number(expectedSequence.sequence);
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new Error("battle presentation acknowledgement requires a captured command sequence token");
  }

  const checkpoint = battle.presentation_checkpoint;
  if (!checkpoint || expectedSequence.checkpoint !== checkpoint) {
    throw new Error("stale battle presentation acknowledgement belongs to a different presentation checkpoint");
  }
  if (Number(checkpoint.sequence) !== sequence) {
    throw new Error(
      `stale battle presentation acknowledgement belongs to command sequence ${sequence}; current presentation sequence is ${checkpoint.sequence}`,
    );
  }
  return completeSafariBattlePresentation(runtime);
}
