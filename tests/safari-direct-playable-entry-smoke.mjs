import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const integrationSource = readFileSync(new URL("runtime/safari-playable-integration.js", root), "utf8");

assert.equal(html.includes('type="importmap"'), false, "Safari entry must not rely on an importmap shim");
assert.equal(html.includes("safari-playable-integration-ai.js"), false, "deleted facade must not remain in HTML");
assert.equal(integrationSource.includes("?canonical-base=1"), false, "direct entry must not self-import through a query-string escape hatch");
assert.equal(
  existsSync(fileURLToPath(new URL("runtime/safari-playable-integration-ai.js", root))),
  false,
  "obsolete AI facade must stay deleted",
);

const integration = await import("../runtime/safari-playable-integration.js");
const runtime = integration.createSafariPlayableRuntime();
assert.equal(globalThis.__maplessSafariRuntime, runtime, "direct runtime entry must expose the live runtime used by scene presentation");
assert.equal(typeof integration.resolveSafariBattleRound, "function");
assert.equal(typeof integration.SAFARI_MOVE_PRESENTATION, "object");

console.log("safari direct playable entry smoke: ok");
