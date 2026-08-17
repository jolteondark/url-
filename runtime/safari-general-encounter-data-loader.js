import { projectGeneralEncounterSpeciesPools } from "./general-encounter-species-pools.js";

const CHUNK_COUNT = 20;
const BROWSER_IMPORT_BATCH = 4;
const LOAD_TIMEOUT_MS = 20_000;
const CHUNK_PATHS = Object.freeze(Array.from(
  { length: CHUNK_COUNT },
  (_, index) => `./generated/safari-general-encounter-data-v2-${String(index).padStart(2, "0")}.js`,
));
const CHUNK_LOADERS = Object.freeze(CHUNK_PATHS.map(
  (path) => () => import(new URL(path, import.meta.url).href),
));

const GENDER_RATIO_IDS = Object.freeze([
  "AlwaysMale", "AlwaysFemale", "Genderless", "FemaleOneEighth",
  "Female25Percent", "Female50Percent", "Female75Percent", "FemaleSevenEighths",
]);
const GENDER_RATIO_INDEX_PACKED = "54555554155555555555455555555555652555555535555255555555533515555551355053225553555555552555555555551535335553353355563555266655555336455655555555533525556553553535556535352555255555555555555555555355555555555555555355544524535355355555255553355555515535555131555555533153555055555555525525356555555555525255556665565555350333455554551411155555555550005555555555556103535335563551451555555525552255555555555555355555551557355555535525655554444554422245515555555553552555335522555515155625553505055535535555555011010565555555555555556535555555333555555555551555555535555553555552255322235355555675533333535555553555555553355555523055531355555055355355555555555335552555555555555553332255535565555555555555515535355635255555555355355552251555555555555355555355525555055535034111555333353335555555355551535535035255555355555315555550521655535555555555655555555155555555555553355";

const TYPE_IDS = Object.freeze([
  "BUG", "DARK", "DRAGON", "ELECTRIC", "FAIRY", "FIGHTING", "FIRE", "FLYING", "GHOST",
  "GRASS", "GROUND", "ICE", "NORMAL", "POISON", "PSYCHIC", "ROCK", "STEEL", "WATER",
]);
const TYPE_INDEX_PACKED = "9fddd7c7ce77eegf9hhhhh6594180c53bbgb54ddc71dccc166bccaac79725h1h005ag96e3347b522d5d1c8eccce995cch45d1c8c11440c785adc43hccc53c222222245e7a9275aac3333336ccc9c6ececc44c11c7c026c5666660ac66666g11h44975c5c591bbc0cedgg9cg2c999ecc8eecd7g5cbccafcee66gc8ca51cc9c7hccccebbbbbbbbbe6609eggg1heg11cc86999909c8hehcc55e059eee33g9c90cc1ggg5gccccceb444cdhaa61c181c531h5c2236c311c7c9980c47dddddd0ccbfeee19cceeeeeeceed61c5080c6hc9hccececc55ccfff5fffef7ac5cfafahccc95c8888cbc6g3a0ccce0c7ccc9cdddfgdc1hcbhc993he9a9g488cc9fg0ccaffe5c900c95c16c5chcc4cc1c99c0cc7cf1cccec1c1333333cc161dddcce8eh59e2c05dd9c53hhhhhhhchcf367che9c9c0c3e3";
const THAWS_USER_MOVE_IDS = new Set([
  "BURNUP", "FLAMEWHEEL", "FLAREBLITZ", "MATCHAGOTCHA", "PYROBALL", "SCALD",
]);

function withTimeout(promise, timeoutMs, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  });
}

function reportBrowserLoadProgress(loaded, phase = "chunks") {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function" || typeof CustomEvent !== "function") return;
  window.dispatchEvent(new CustomEvent("safari-general-load-progress", {
    detail: { loaded, total: CHUNK_COUNT, phase },
  }));
}

async function loadEncodedChunks() {
  const chunks = [];
  for (let start = 0; start < CHUNK_COUNT; start += BROWSER_IMPORT_BATCH) {
    const end = Math.min(start + BROWSER_IMPORT_BATCH, CHUNK_COUNT);
    const modules = await withTimeout(
      Promise.all(CHUNK_LOADERS.slice(start, end).map((load) => load())),
      LOAD_TIMEOUT_MS,
      `Safari GENERAL data ${start + 1}-${end}`,
    );
    for (let index = 0; index < modules.length; index += 1) {
      const encoded = modules[index]?.default;
      if (typeof encoded !== "string" || encoded.length === 0) {
        throw new Error(`empty Safari GENERAL chunk: ${CHUNK_PATHS[start + index]}`);
      }
      chunks.push(encoded);
    }
    reportBrowserLoadProgress(chunks.length);
    if (typeof window !== "undefined") await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return chunks;
}

const encoded = (await loadEncodedChunks()).join("");
const binary = typeof atob === "function"
  ? Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
  : Uint8Array.from(Buffer.from(encoded, "base64"));
if (typeof DecompressionStream !== "function") throw new Error("Safari General Encounter data requires DecompressionStream support");
reportBrowserLoadProgress(CHUNK_COUNT, "decompress");
const stream = new Blob([binary]).stream().pipeThrough(new DecompressionStream("deflate"));
const payloadText = await withTimeout(
  new Response(stream).text(),
  LOAD_TIMEOUT_MS,
  "Safari GENERAL decompression",
);
const payload = JSON.parse(payloadText);
reportBrowserLoadProgress(CHUNK_COUNT, "ready");

const STAT_IDS = ["HP", "ATTACK", "DEFENSE", "SPEED", "SPECIAL_ATTACK", "SPECIAL_DEFENSE"];
const CATEGORY_NAMES = ["Physical", "Special", "Status"];
const speciesIds = [...new Set(Object.values(projectGeneralEncounterSpeciesPools())
  .flatMap((byStage) => Object.values(byStage).flat()))].sort();

if (speciesIds.length !== 875 || payload.speciesRows.length !== speciesIds.length) throw new Error(`Safari General Encounter species count mismatch: ${speciesIds.length}/${payload.speciesRows.length}`);
if (!Array.isArray(payload.moveIds) || !Array.isArray(payload.moveRows) || payload.moveIds.length !== payload.moveRows.length) throw new Error("Safari General Encounter move projection mismatch");
if (GENDER_RATIO_INDEX_PACKED.length !== speciesIds.length) throw new Error(`Safari species individual fact count mismatch: ${GENDER_RATIO_INDEX_PACKED.length}/${speciesIds.length}`);
if (TYPE_INDEX_PACKED.length !== payload.moveIds.length) throw new Error(`Safari move AI fact count mismatch: ${TYPE_INDEX_PACKED.length}/${payload.moveIds.length}`);
if (speciesIds[0] !== "ABOMASNOW" || speciesIds.at(-1) !== "ZWEILOUS") throw new Error("Safari species individual fact ordering mismatch");
if (payload.moveIds[0] !== "ABSORB" || payload.moveIds.at(-1) !== "ZINGZAP") throw new Error("Safari move AI fact ordering mismatch");

function speciesMaster(id, row, speciesIndex) {
  const [stats, baseExp, catchRate, levelMoves, dexNumber] = row;
  const genderRatio = GENDER_RATIO_IDS[Number(GENDER_RATIO_INDEX_PACKED[speciesIndex])];
  if (!genderRatio) throw new Error(`Safari species gender ratio mismatch for ${id}`);
  return Object.freeze({
    id, name: id,
    base_stats: Object.freeze(Object.fromEntries(STAT_IDS.map((stat, index) => [stat, Number(stats[index])]))),
    base_exp: Number(baseExp),
    catch_rate: Number(catchRate),
    level_moves: Object.freeze(levelMoves.map(([level, moveIndex]) => Object.freeze({ level: Number(level), move: payload.moveIds[Number(moveIndex)] }))),
    dex_number: Number(dexNumber),
    gender_ratio: genderRatio,
  });
}

function moveMaster(id, row, moveIndex) {
  const [categoryIndex, power, accuracy, totalPp, priority] = row;
  const category = CATEGORY_NAMES[Number(categoryIndex)];
  if (!category) throw new Error(`unknown move category for ${id}`);
  const type = TYPE_IDS[Number.parseInt(TYPE_INDEX_PACKED[moveIndex], 36)];
  if (!type) throw new Error(`Safari move AI fact type index mismatch for ${id}`);
  return Object.freeze({
    id, name: id, category,
    power: Number(power), accuracy: Number(accuracy), total_pp: Number(totalPp), priority: Number(priority),
    type, thaws_user: THAWS_USER_MOVE_IDS.has(id),
  });
}

export const SAFARI_GENERAL_SPECIES_MASTERS = Object.freeze(Object.fromEntries(
  speciesIds.map((id, index) => [id, speciesMaster(id, payload.speciesRows[index], index)]),
));
export const SAFARI_GENERAL_MOVE_MASTERS = Object.freeze(Object.fromEntries(
  payload.moveIds.map((id, index) => [id, moveMaster(id, payload.moveRows[index], index)]),
));

export const SAFARI_GENERAL_DATA_METADATA = Object.freeze({
  speciesCount: speciesIds.length,
  moveCount: payload.moveIds.length,
  projectionSha256: "1203433d0aa6e07dfe4e71065bd23d03adb2499df8837e2e7c032df4f2a5fe09",
  canonicalFilteredCoreSha256: "e35eecadc21535e57a4cd9946abfea9a52ed9268b12456e2934e0ef7eeabb1ab",
});
if (SAFARI_GENERAL_DATA_METADATA.speciesCount !== 875 || SAFARI_GENERAL_DATA_METADATA.moveCount !== 608) throw new Error(`Safari General Encounter projection mismatch: ${SAFARI_GENERAL_DATA_METADATA.speciesCount}/${SAFARI_GENERAL_DATA_METADATA.moveCount}`);

export function safariCanonicalResetMoves(speciesId, level) {
  const master = SAFARI_GENERAL_SPECIES_MASTERS[speciesId];
  if (!master) throw new RangeError(`unknown Safari GENERAL species: ${speciesId}`);
  const currentLevel = Math.max(1, Math.min(100, Math.trunc(Number(level))));
  const knowable = master.level_moves.filter((entry) => entry.level >= 0 && entry.level <= currentLevel).map((entry) => entry.move);
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
