const GENERAL_DATA_LOADER_PATH = "./safari-general-encounter-data-loader.js";
const GENERAL_COMBAT_MODULE_PATHS = Object.freeze({
  wild: "./safari-general-encounter-runtime.js",
  trainer: "./mapless-dynamic-trainer-generator.js",
});

function normalizeRetryGeneration(retryGeneration = 0) {
  return Math.max(0, Math.trunc(Number(retryGeneration) || 0));
}

export function safariGeneralLoaderSpecifier(retryGeneration = 0) {
  const generation = normalizeRetryGeneration(retryGeneration);
  if (generation === 0) return GENERAL_DATA_LOADER_PATH;
  return `${GENERAL_DATA_LOADER_PATH}?retry=${generation}`;
}

export function safariGeneralCombatModuleSpecifier(kind, retryGeneration = 0) {
  const path = GENERAL_COMBAT_MODULE_PATHS[kind];
  if (!path) throw new TypeError(`unknown Safari GENERAL combat module kind: ${kind}`);
  const generation = normalizeRetryGeneration(retryGeneration);
  if (generation === 0) return path;
  return `${path}?retry=${generation}`;
}

export function safariGeneralChunkImportUrl(path, loaderUrl = import.meta.url) {
  const url = new URL(path, loaderUrl);
  const retry = new URL(loaderUrl).searchParams.get("retry");
  if (retry) url.searchParams.set("retry", retry);
  return url.href;
}
