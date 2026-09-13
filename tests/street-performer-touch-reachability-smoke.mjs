import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const presentation = readFileSync(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
const owner = readFileSync(new URL("../runtime/safari-street-performer-interaction.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  presentation,
  /if \(active\.eventId === "street_performer"\) \{[\s\S]*?await owner\.safariStreetPerformerChoices\(current\)[\s\S]*?\{ id:"watch"[\s\S]*?\{ id:"callout"[\s\S]*?\{ id:"leave"/,
  "Street Performer touch rendering must project perform:* choices from the existing owner and preserve watch/callout/leave",
);
assert.match(
  presentation,
  /if \(active\.eventId === "street_performer"\) return owner\.resolveSafariStreetPerformerInteraction\(current, active\.boardIndex, actionId\);/,
  "Street Performer touch actions must delegate execution to the existing owner",
);
assert.match(
  owner,
  /export async function safariStreetPerformerChoices\(runtime\)/,
  "Street Performer owner must continue to expose the canonical perform:* choice projection",
);
assert.match(
  owner,
  /availableActions:\[\.\.\.choices\.map\(\(entry\) => entry\.id\), "watch", "callout", "leave"\]/,
  "Street Performer owner must continue to advertise perform/watch/callout/leave as its supported action surface",
);
assert.match(
  index,
  /<script type="module" src="\.\/normal-event-touch-presentation\.js\?v=20260912-1900"><\/script>/,
  "Safari/Web must serve the post-owner-projection normal-event touch presentation generation",
);
assert.match(
  index,
  /"\.\/runtime\/safari-street-performer-interaction\.js": "\.\/runtime\/safari-street-performer-interaction\.js\?v=20260910-1205"/,
  "Street Performer owner must resolve through the current public import-map generation",
);

console.log("Street Performer touch reachability smoke passed");
