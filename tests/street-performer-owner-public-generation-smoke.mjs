import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../runtime/safari-street-performer-interaction.js', import.meta.url), 'utf8');

assert.match(
  html,
  /"\.\/runtime\/safari-street-performer-interaction\.js": "\.\/runtime\/safari-street-performer-interaction\.js\?v=20260910-1205"/,
  'reachable Safari Street Performer owner must be delivered through the current public import-map generation after owner persistence convergence',
);
assert.doesNotMatch(
  html,
  /safari-street-performer-interaction\.js\?v=20260909-0830/,
  'do not retain the pre-#1437 Street Performer owner generation',
);
assert.match(source, /function operationsRequestSave\(operations = \[\]\)/, 'Street Performer should derive save intent from emitted operations');
assert.match(source, /\{ op:"request_save", reason:"normal_event_street_performer" \}/, 'resolved non-Battle Street Performer routes should emit request_save');
assert.doesNotMatch(source, /persistenceRequested:true/, 'Street Performer must not keep an independent persistence boolean truth');

console.log('street performer owner public generation smoke: ok');
