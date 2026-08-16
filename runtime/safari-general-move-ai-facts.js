// Generated compact Battle-AI facts for the 608 canonical GENERAL level-up moves.
// The ordering is the same sorted move-id ordering used by safari-general-encounter-data-loader.js.
// This deliberately projects only facts currently consumed by M0384: move type and ThawsUser.

const TYPE_IDS = Object.freeze([
  "BUG", "DARK", "DRAGON", "ELECTRIC", "FAIRY", "FIGHTING", "FIRE", "FLYING", "GHOST",
  "GRASS", "GROUND", "ICE", "NORMAL", "POISON", "PSYCHIC", "ROCK", "STEEL", "WATER",
]);
const TYPE_INDEX_PACKED = "9fddd7c7ce77eegf9hhhhh6594180c53bbgb54ddc71dccc166bccaac79725h1h005ag96e3347b522d5d1c8eccce995cch45d1c8c11440c785adc43hccc53c222222245e7a9275aac3333336ccc9c6ececc44c11c7c026c5666660ac66666g11h44975c5c591bbc0cedgg9cg2c999ecc8eecd7g5cbccafcee66gc8ca51cc9c7hccccebbbbbbbbbe6609eggg1heg11cc86999909c8hehcc55e059eee33g9c90cc1ggg5gccccceb444cdhaa61c181c531h5c2236c311c7c9980c47dddddd0ccbfeee19cceeeeeeceed61c5080c6hc9hccececc55ccfff5fffef7ac5cfafahccc95c8888cbc6g3a0ccce0c7ccc9cdddfgdc1hcbhc993he9a9g488cc9fg0ccaffe5c900c95c16c5chcc4cc1c99c0cc7cf1cccec1c1333333cc161dddcce8eh59e2c05dd9c53hhhhhhhchcf367che9c9c0c3e3";
const THAWS_USER_MOVE_IDS = new Set(["BURNUP", "FLAMEWHEEL", "FLAREBLITZ", "MATCHAGOTCHA", "PYROBALL", "SCALD"]);

export const SAFARI_GENERAL_MOVE_AI_FACTS_METADATA = Object.freeze({
  moveCount: 608,
  firstMoveId: "ABSORB",
  lastMoveId: "ZINGZAP",
  canonicalFactsSha256: "916a4c6932af5d024db6acea7f67623ae24b3d03470d91227cfeff9212615c24",
});

export function safariGeneralMoveAiFacts(moveId, moveIndex, moveCount = SAFARI_GENERAL_MOVE_AI_FACTS_METADATA.moveCount) {
  const index = Number(moveIndex);
  if (moveCount !== SAFARI_GENERAL_MOVE_AI_FACTS_METADATA.moveCount) {
    throw new Error(`Safari move AI fact count mismatch: ${moveCount}`);
  }
  if (!Number.isInteger(index) || index < 0 || index >= TYPE_INDEX_PACKED.length) {
    throw new RangeError(`Safari move AI fact index out of range: ${moveIndex}`);
  }
  const id = String(moveId ?? "");
  if (index === 0 && id !== SAFARI_GENERAL_MOVE_AI_FACTS_METADATA.firstMoveId) {
    throw new Error(`Safari move AI fact ordering mismatch at first move: ${id}`);
  }
  if (index === TYPE_INDEX_PACKED.length - 1 && id !== SAFARI_GENERAL_MOVE_AI_FACTS_METADATA.lastMoveId) {
    throw new Error(`Safari move AI fact ordering mismatch at last move: ${id}`);
  }
  const typeIndex = Number.parseInt(TYPE_INDEX_PACKED[index], 36);
  const type = TYPE_IDS[typeIndex];
  if (!type) throw new Error(`Safari move AI fact type index mismatch for ${id}`);
  return Object.freeze({ type, thaws_user: THAWS_USER_MOVE_IDS.has(id) });
}
