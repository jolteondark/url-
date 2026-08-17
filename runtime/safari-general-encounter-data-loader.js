import { projectGeneralEncounterSpeciesPools } from "./general-encounter-species-pools.js";
import chunk00 from "./generated/safari-general-encounter-data-v2-00.js";
import chunk01 from "./generated/safari-general-encounter-data-v2-01.js";
import chunk02 from "./generated/safari-general-encounter-data-v2-02.js";
import chunk03 from "./generated/safari-general-encounter-data-v2-03.js";
import chunk04 from "./generated/safari-general-encounter-data-v2-04.js";
import chunk05 from "./generated/safari-general-encounter-data-v2-05.js";
import chunk06 from "./generated/safari-general-encounter-data-v2-06.js";
import chunk07 from "./generated/safari-general-encounter-data-v2-07.js";
import chunk08 from "./generated/safari-general-encounter-data-v2-08.js";
import chunk09 from "./generated/safari-general-encounter-data-v2-09.js";
import chunk10 from "./generated/safari-general-encounter-data-v2-10.js";
import chunk11 from "./generated/safari-general-encounter-data-v2-11.js";
import chunk12 from "./generated/safari-general-encounter-data-v2-12.js";
import chunk13 from "./generated/safari-general-encounter-data-v2-13.js";
import chunk14 from "./generated/safari-general-encounter-data-v2-14.js";
import chunk15 from "./generated/safari-general-encounter-data-v2-15.js";
import chunk16 from "./generated/safari-general-encounter-data-v2-16.js";
import chunk17 from "./generated/safari-general-encounter-data-v2-17.js";
import chunk18 from "./generated/safari-general-encounter-data-v2-18.js";
import chunk19 from "./generated/safari-general-encounter-data-v2-19.js";

const CHUNK_COUNT = 20;
const LOAD_TIMEOUT_MS = 20_000;
const ENCODED_CHUNKS = Object.freeze([
  chunk00, chunk01, chunk02, chunk03, chunk04,
  chunk05, chunk06, chunk07, chunk08, chunk09,
  chunk10, chunk11, chunk12, chunk13, chunk14,
  chunk15, chunk16, chunk17, chunk18, chunk19,
]);

const GENDER_RATIO_IDS = Object.freeze(["AlwaysMale","AlwaysFemale","Genderless","FemaleOneEighth","Female25Percent","Female50Percent","Female75Percent","FemaleSevenEighths"]);
const GENDER_RATIO_INDEX_PACKED = "54555554155555555555455555555555652555555535555255555555533515555551355053225553555555552555555555551535335553353355563555266655555336455655555555533525556553553535556535352555255555555555555555555355555555555555555355544524535355355555255553355555515535555131555555533153555055555555525525356555555555525255556665565555350333455554551411155555555550005555555555556103535335563551451555555525552255555555555555355555551557355555535525655554444554422245515555555553552555335522555515155625553505055535535555555011010565555555555555556535555555333555555555551555555535555553555552255322235355555675533333535555553555555553355555523055531355555055355355555555555335552555555555555553332255535565555555555555515535355635255555555355355552251555555555555355555355525555055535034111555333353335555555355551535535035255555355555315555550521655535555555555655555555155555555555553355";
const TYPE_IDS = Object.freeze([
  "BUG", "DARK", "DRAGON", "ELECTRIC", "FAIRY", "FIGHTING", "FIRE", "FLYING", "GHOST",
  "GRASS", "GROUND", "ICE", "NORMAL", "POISON", "PSYCHIC", "ROCK", "STEEL", "WATER",
]);
const TYPE_INDEX_PACKED = "9fddd7c7ce77eegf9hhhhh6594180c53bbgb54ddc71dccc166bccaac79725h1h005ag96e3347b522d5d1c8eccce995cch45d1c8c11440c785adc43hccc53c222222245e7a9275aac3333336ccc9c6ececc44c11c7c026c5666660ac66666g11h44975c5c591bbc0cedgg9cg2c999ecc8eecd7g5cbccafcee66gc8ca51cc9c7hccccebbbbbbbbbe6609eggg1heg11cc86999909c8hehcc55e059eee33g9c90cc1ggg5gccccceb444cdhaa61c181c531h5c2236c311c7c9980c47dddddd0ccbfeee19cceeeeeeceed61c5080c6hc9hccececc55ccfff5fffef7ac5cfafahccc95c8888cbc6g3a0ccce0c7ccc9cdddfgdc1hcbhc993he9a9g488cc9fg0ccaffe5c900c95c16c5chcc4cc1c99c0cc7cf1cccec1c1333333cc161dddcce8eh59e2c05dd9c53hhhhhhhchcf367che9c9c0c3e3";
const THAWS_USER_MOVE_IDS = new Set(["BURNUP", "FLAMEWHEEL", "FLAREBLITZ", "MATCHAGOTCHA", "PYROBALL", "SCALD"]);

function withTimeout(promise, timeoutMs, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  });
}

function reportBrowserLoadProgress(loaded, phase) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function" || typeof CustomEvent !== "function") return;
  window.dispatchEvent(new CustomEvent("safari-general-load-progress", {
    detail: { loaded, total: CHUNK_COUNT, phase },
  }));
}

if (ENCODED_CHUNKS.length !== CHUNK_COUNT || ENCODED_CHUNKS.some((chunk) => typeof chunk !== "string" || chunk.length === 0)) {
  throw new Error("Safari GENERAL static chunk projection mismatch");
}
const encoded = ENCODED_CHUNKS.join("");
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

export function safariGeneralSpeciesIndividualFacts(speciesId, speciesIndex, speciesCount = speciesIds.length) {
  const index = Number(speciesIndex);
  if (speciesCount !== speciesIds.length) throw new Error(`Safari species individual fact count mismatch: ${speciesCount}`);
  if (!Number.isInteger(index) || index < 0 || index >= GENDER_RATIO_INDEX_PACKED.length) throw new RangeError(`Safari species individual fact index out of range: ${speciesIndex}`);
  const id = String(speciesId ?? "");
  if (speciesIds[index] !== id) throw new Error(`Safari species individual fact ordering mismatch at ${index}: ${id}`);
  const genderRatio = GENDER_RATIO_IDS[Number(GENDER_RATIO_INDEX_PACKED[index])];
  if (!genderRatio) throw new Error(`Safari species gender ratio mismatch for ${id}`);
  return Object.freeze({ gender_ratio: genderRatio });
}

export function safariGeneralMoveAiFacts(moveId, moveIndex, moveCount = payload.moveIds.length) {
  const index = Number(moveIndex);
  if (moveCount !== payload.moveIds.length) throw new Error(`Safari move AI fact count mismatch: ${moveCount}`);
  if (!Number.isInteger(index) || index < 0 || index >= TYPE_INDEX_PACKED.length) throw new RangeError(`Safari move AI fact index out of range: ${moveIndex}`);
  const id = String(moveId ?? "");
  if (payload.moveIds[index] !== id) throw new Error(`Safari move AI fact ordering mismatch at ${index}: ${id}`);
  const type = TYPE_IDS[Number.parseInt(TYPE_INDEX_PACKED[index], 36)];
  if (!type) throw new Error(`Safari move AI fact type index mismatch for ${id}`);
  return Object.freeze({ type, thaws_user: THAWS_USER_MOVE_IDS.has(id) });
}

function speciesMaster(id, row, speciesIndex) {
  const [stats, baseExp, catchRate, levelMoves, dexNumber] = row;
  const individualFacts = safariGeneralSpeciesIndividualFacts(id, speciesIndex, speciesIds.length);
  return Object.freeze({
    id, name: id,
    base_stats: Object.freeze(Object.fromEntries(STAT_IDS.map((stat, index) => [stat, Number(stats[index])]))),
    base_exp: Number(baseExp),
    catch_rate: Number(catchRate),
    level_moves: Object.freeze(levelMoves.map(([level, moveIndex]) => Object.freeze({ level: Number(level), move: payload.moveIds[Number(moveIndex)] }))),
    dex_number: Number(dexNumber),
    gender_ratio: individualFacts.gender_ratio,
  });
}

function moveMaster(id, row, moveIndex) {
  const [categoryIndex, power, accuracy, totalPp, priority] = row;
  const category = CATEGORY_NAMES[Number(categoryIndex)];
  if (!category) throw new Error(`unknown move category for ${id}`);
  const aiFacts = safariGeneralMoveAiFacts(id, moveIndex, payload.moveIds.length);
  return Object.freeze({
    id, name: id, category,
    power: Number(power), accuracy: Number(accuracy), total_pp: Number(totalPp), priority: Number(priority),
    type: aiFacts.type, thaws_user: aiFacts.thaws_user,
  });
}

function lazyMasterProjection(ids, rows, factory) {
  const indexById = new Map(ids.map((id, index) => [id, index]));
  const cache = new Map();
  const projection = new Proxy(Object.create(null), {
    get(_target, property) {
      if (typeof property !== "string") return undefined;
      const index = indexById.get(property);
      if (index === undefined) return undefined;
      if (!cache.has(property)) cache.set(property, factory(property, rows[index], index));
      return cache.get(property);
    },
    has(_target, property) {
      return typeof property === "string" && indexById.has(property);
    },
    ownKeys() {
      return [...ids];
    },
    getOwnPropertyDescriptor(_target, property) {
      if (typeof property !== "string" || !indexById.has(property)) return undefined;
      return { configurable: true, enumerable: true };
    },
  });
  return { projection, cache };
}

const lazySpecies = lazyMasterProjection(speciesIds, payload.speciesRows, speciesMaster);
const lazyMoves = lazyMasterProjection(payload.moveIds, payload.moveRows, moveMaster);

// These projections preserve ordinary object access/Object.keys/Object.assign
// semantics, but only construct a master object when that specific key is read.
export const SAFARI_GENERAL_SPECIES_MASTERS = lazySpecies.projection;
export const SAFARI_GENERAL_MOVE_MASTERS = lazyMoves.projection;

export function safariGeneralMaterializedMasterCounts() {
  return Object.freeze({ species: lazySpecies.cache.size, moves: lazyMoves.cache.size });
}

export const SAFARI_GENERAL_DATA_METADATA = Object.freeze({
  speciesCount: speciesIds.length,
  moveCount: payload.moveIds.length,
  projectionSha256: "1203433d0aa6e07dfe4e71065bd23d03adb2499df8837e2e7c032df4f2a5fe09",
  speciesIndividualFactsSha256: "3546f4d714738f72947f6d61d1bc876b0df4f0f72a45592c1e8f91eecbace1f8",
  moveAiFactsSha256: "916a4c6932af5d024db6acea7f67623ae24b3d03470d91227cfeff9212615c24",
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
