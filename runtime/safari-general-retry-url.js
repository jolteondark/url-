const GENERAL_DATA_LOADER_PATH = "./safari-general-encounter-data-loader.js";

export function safariGeneralLoaderSpecifier(retryGeneration = 0) {
  const generation = Math.max(0, Math.trunc(Number(retryGeneration) || 0));
  if (generation === 0) return GENERAL_DATA_LOADER_PATH;
  return `${GENERAL_DATA_LOADER_PATH}?retry=${generation}`;
}

export function safariGeneralChunkImportUrl(path, loaderUrl = import.meta.url) {
  const url = new URL(path, loaderUrl);
  const retry = new URL(loaderUrl).searchParams.get("retry");
  if (retry) url.searchParams.set("retry", retry);
  return url.href;
}
