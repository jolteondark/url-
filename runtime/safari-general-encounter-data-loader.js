import { projectGeneralEncounterSpeciesPools } from "./general-encounter-species-pools.js";
import { safariGeneralMoveAiFacts } from "./safari-general-move-ai-facts.js";
import { safariGeneralSpeciesIndividualFacts } from "./safari-general-species-individual-facts.js";

const CHUNK_COUNT = 20;
const BROWSER_FETCH_BATCH = 4;
const LOAD_TIMEOUT_MS = 20_000;
const CHUNK_PATHS = Object.freeze(Array.from(
  { length: CHUNK_COUNT },
  (_, index) => `./generated/safari-general-encounter-data-v2-${String(index).padStart(2, "0")}.js`,
));

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

function encodedChunkFromModuleSource(source, path) {
  const prefix = "export default ";
  const trimmed = String(source ?? "").trim();
  if (!trimmed.startsWith(prefix)) throw new Error(`invalid Safari GENERAL chunk source: ${path}`);
  const literal = trimmed.slice(prefix.length).replace(/;\s*$/, "");
  const encoded = JSON.parse(literal);
  if (typeof encoded !== "string" || encoded.length === 0) {
    throw new Error(`empty Safari GENERAL chunk: ${path}`);
  }
  return encoded;
}

async function fetchEncodedChunk(path) {
  const url = new URL(path, import.meta.url);
  const response = await fetch(url, { cache: "force-cache", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Safari GENERAL chunk fetch failed: ${response.status} ${path}`);
  return encodedChunkFromModuleSource(await response.text(), path);
}

async function loadBrowserEncodedChunks() {
  const chunks = [];
  for (let start = 0; start < CHUNK_COUNT; start += BROWSER_FETCH_BATCH) {
    const end = Math.min(start + BROWSER_FETCH_BATCH, CHUNK_COUNT);
    const batch = await withTimeout(
      Promise.all(CHUNK_PATHS.slice(start, end).map(fetchEncodedChunk)),
      LOAD_TIMEOUT_MS,
      `Safari GENERAL data ${start + 1}-${end}`,
    );
    chunks.push(...batch);
    reportBrowserLoadProgress(chunks.length);
    // Yield once per small network batch so WebKit can paint progress/input.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return chunks;
}

async function loadNodeEncodedChunks() {
  const modules = await Promise.all(CHUNK_PATHS.map((path) => import(new URL(path, import.meta.url).href)));
  return modules.map((module) => module.default);
}

const encodedChunks = typeof window !== "undefined"
  ? await loadBrowserEncodedChunks()
  : await loadNodeEncodedChunks();
const encoded = encodedChunks.join("");
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
