import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const presentation = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");

const ownerSpecifiers = [...presentation.matchAll(/(?:\w+):"(\.\/runtime\/safari-[^"]+\.js(?:\?v=[^"]+)?)"/g)]
  .map((match) => match[1])
  .filter((specifier) => !specifier.includes("?v="));

assert.ok(ownerSpecifiers.length > 0, "expected unversioned owner specifiers in generic normal-event dispatcher");
for (const specifier of ownerSpecifiers) {
  const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(
    index,
    new RegExp(`"${escaped}"\\s*:\\s*"${escaped}\\?v=20260827-0100"`),
    `Safari import map must pin ${specifier}`,
  );
}

console.log(`ok - pinned ${ownerSpecifiers.length} generic normal-event Safari owners`);
