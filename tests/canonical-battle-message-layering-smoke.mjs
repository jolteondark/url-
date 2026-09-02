import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [messageBridge, uiBridge, css, loader, html] = await Promise.all([
  read("canonical-battleback-message-bridge.js"),
  read("canonical-battle-ui-bridge.js"),
  read("battle-dppt-ui.css"),
  read("deferred-ui-loader.js"),
  read("index.html"),
]);

assert.match(
  messageBridge,
  /card\?\.querySelector\("\.battle-command-panel"\)/,
  "field_message must target the command-bar layer, not the message overlay",
);
assert.doesNotMatch(
  messageBridge,
  /getElementById\("battle-message"\)/,
  "battleback field_message must not overwrite the canonical overlay_message layer",
);
assert.match(
  uiBridge,
  /"--canonical-battle-message-overlay":\s*"overlay_message\.png"/,
  "canonical battle UI must retain overlay_message as the message-box graphic",
);
assert.match(
  css,
  /\.battle-message[\s\S]*?background-image:\s*var\(--canonical-battle-message-overlay/,
  "battle message box must continue to render overlay_message independently",
);
assert.match(
  html,
  /<div class="battle-command-panel"><p class="notice battle-message" id="battle-message">/,
  "reachable battle DOM must retain separate command-panel and message-box layers",
);
assert.match(
  loader,
  /BATTLE_PRESENTATION_PUBLIC_REVISION = "20260903-0700"/,
  "Safari battle bundle must receive a fresh revision for the layer fix",
);
assert.match(
  loader,
  /battlePresentationUrl\("\.\/canonical-battleback-message-bridge\.js"\)/,
  "the corrected bridge must remain on the shared battle presentation delivery path",
);

console.log("canonical battle message layering smoke: ok");
