import { installCanonicalBattlebackPresentation } from "./runtime/canonical-battleback-presentation.js";

try {
  installCanonicalBattlebackPresentation(document);
} catch (error) {
  globalThis.__maplessLastError = error instanceof Error ? error : new Error(String(error));
  console.error("[Mapless] canonical Battleback presentation install failed", globalThis.__maplessLastError);
}
