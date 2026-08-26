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
    new RegExp(`"${escaped}"\\s*:\\s*"${escaped}\\?v=[^"]+"`),
    `Safari import map must pin ${specifier} to a versioned URL`,
  );
}

assert.match(
  index,
  /"\.\/runtime\/safari-honey-tree-interaction\.js"\s*:\s*"\.\/runtime\/safari-honey-tree-interaction\.js\?v=20260827-0305"/,
  "Honey Tree must fetch the post-#904 canonical reward/RNG owner generation",
);
assert.doesNotMatch(
  index,
  /"\.\/runtime\/safari-honey-tree-interaction\.js"\s*:\s*"\.\/runtime\/safari-honey-tree-interaction\.js\?v=20260827-0100"/,
  "Honey Tree must not stay pinned to the pre-#904 owner generation",
);

console.log(`ok - pinned ${ownerSpecifiers.length} generic normal-event Safari owners; Honey Tree is post-#904`);
