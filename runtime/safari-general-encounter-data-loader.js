import { projectGeneralEncounterSpeciesPools } from "./general-encounter-species-pools.js";

const chunks = await Promise.all([
  import("./generated/safari-general-encounter-data-00.js"),
  import("./generated/safari-general-encounter-data-01.js"),
  import("./generated/safari-general-encounter-data-02.js"),
  import("./generated/safari-general-encounter-data-03.js"),
  import("./generated/safari-general-encounter-data-04.js"),
  import("./generated/safari-general-encounter-data-05.js"),
  import("./generated/safari-general-encounter-data-06.js"),
  import("./generated/safari-general-encounter-data-07.js"),
]);

const encoded = chunks.map((chunk) => chunk.default).join("");
const binary = typeof atob === "function"
  ? Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
  : Uint8Array.from(Buffer.from(encoded, "base64"));
if (typeof DecompressionStream !== "function") {
  throw new Error("Safari General Encounter data requires DecompressionStream support");
}
const stream = new Blob([binary]).stream().pipeThrough(new DecompressionStream("deflate"));
const payload = JSON.parse(await new Response(stream).text());

const STAT_IDS = ["HP", "ATTACK", "DEFENSE", "SPEED", "SPECIAL_ATTACK", "SPECIAL_DEFENSE"];
const CATEGORY_NAMES = ["Physical", "Special", "Status"];
const speciesIds = [...new Set(Object.values(projectGeneralEncounterSpeciesPools())
  .flatMap((byStage) => Object.values(byStage).flat()))].sort();

if (speciesIds.length !== 875 || payload.speciesRows.length !== speciesIds.length) {
  throw new Error(`Safari General Encounter species count mismatch: ${speciesIds.length}/${payload.speciesRows.length}`);
}
if (!Array.isArray(payload.moveIds) || !Array.isArray(payload.moveRows) || payload.moveIds.length !== payload.moveRows.length) {
  throw new Error("Safari General Encounter move projection mismatch");
}

function speciesMaster(id, row) {
  const [stats, baseExp, catchRate, levelMoves, dexNumber] = row;
  return Object.freeze({
    id,
    name: id,
    base_stats: Object.freeze(Object.fromEntries(STAT_IDS.map((stat, index) => [stat, Number(stats[index])]))),
    base_exp: Number(baseExp),
    catch_rate: Number(catchRate),
    level_moves: Object.freeze(levelMoves.map(([level, moveIndex]) => Object.freeze({
      level: Number(level),
      move: payload.moveIds[Number(moveIndex)],
    }))),
    dex_number: Number(dexNumber),
  });
}

function moveMaster(id, row) {
  const [categoryIndex, power, accuracy, totalPp, priority] = row;
  const category = CATEGORY_NAMES[Number(categoryIndex)];
  if (!category) throw new Error(`unknown move category for ${id}`);
  return Object.freeze({
    id,
    name: id,
    category,
    power: Number(power),
    accuracy: Number(accuracy),
    total_pp: Number(totalPp),
    priority: Number(priority),
  });
}

export const SAFARI_GENERAL_SPECIES_MASTERS = Object.freeze(Object.fromEntries(
  speciesIds.map((id, index) => [id, speciesMaster(id, payload.speciesRows[index])]),
));
export const SAFARI_GENERAL_MOVE_MASTERS = Object.freeze(Object.fromEntries(
  payload.moveIds.map((id, index) => [id, moveMaster(id, payload.moveRows[index])]),
));

export const SAFARI_GENERAL_DATA_METADATA = Object.freeze({
  speciesCount: speciesIds.length,
  moveCount: payload.moveIds.length,
  projectionSha256: "76ee8a13129a9ca840d87dd8b98becc8cd98457b4dd952598a5dd6465ab1a5e3",
  canonicalFilteredCoreSha256: "e35eecadc21535e57a4cd9946abfea9a52ed9268b12456e2934e0ef7eeabb1ab",
});

if (SAFARI_GENERAL_DATA_METADATA.speciesCount !== 875 || SAFARI_GENERAL_DATA_METADATA.moveCount !== 608) {
  throw new Error(`Safari General Encounter projection mismatch: ${SAFARI_GENERAL_DATA_METADATA.speciesCount}/${SAFARI_GENERAL_DATA_METADATA.moveCount}`);
}

export function safariCanonicalResetMoves(speciesId, level) {
  const master = SAFARI_GENERAL_SPECIES_MASTERS[speciesId];
  if (!master) throw new RangeError(`unknown Safari GENERAL species: ${speciesId}`);
  const currentLevel = Math.max(1, Math.min(100, Math.trunc(Number(level))));
  const knowable = master.level_moves
    .filter((entry) => entry.level >= 0 && entry.level <= currentLevel)
    .map((entry) => entry.move);
  const seen = new Set();
  const dedupedReversed = [];
  for (let index = knowable.length - 1; index >= 0; index -= 1) {
    const move = knowable[index];
    if (seen.has(move)) continue;
    seen.add(move);
    dedupedReversed.push(move);
  }
  const resolved = dedupedReversed.reverse().slice(-4);
  if (resolved.length === 0) throw new Error(`canonical reset_moves produced no moves for ${speciesId} Lv.${currentLevel}`);
  return resolved;
}
