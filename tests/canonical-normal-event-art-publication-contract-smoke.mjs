import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const resolverUrl = new URL("../runtime/canonical-normal-event-art-assets.js", import.meta.url);
const resolverSource = readFileSync(resolverUrl, "utf8");
const setMatch = resolverSource.match(/const PUBLISHED_CANONICAL_NORMAL_EVENT_ART = new Set\(([^;]*)\);/s);
assert.ok(setMatch, "published canonical normal-event art set must remain explicit and statically inspectable");

const publishedIds = [...setMatch[1].matchAll(/["']([a-z0-9_]+)["']/g)].map((match) => match[1]);
for (const eventId of publishedIds) {
  const descriptorMatch = resolverSource.match(new RegExp(`\\b${eventId}:\\s*["']([^"']+\\.png)["']`));
  assert.ok(descriptorMatch, `${eventId} must resolve through the shared canonical event-art map`);

  const filename = descriptorMatch[1];
  const assetUrl = new URL(`../assets/canonical-normal-event-art/${filename}`, import.meta.url);
  assert.equal(existsSync(assetUrl), true, `${eventId} published allowlist must not point at a missing/case-mismatched asset`);

  const bytes = readFileSync(fileURLToPath(assetUrl));
  assert.ok(bytes.length >= 8, `${eventId} published canonical artwork must not be empty/truncated`);
  assert.deepEqual(
    [...bytes.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    `${eventId} published canonical artwork must be a PNG at the resolved exact-case path`,
  );
}

console.log(`Canonical normal-event art publication contract smoke: PASS (${publishedIds.length} published)`);
