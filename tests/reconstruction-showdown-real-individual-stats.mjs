import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { inspectExtractedShowdownArtifact } from '../scripts/showdown-browser-artifact-contract.mjs';
import { loadShowdownBrowserArtifact, REQUIRED_SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-browser-artifact.js';
import { projectMaplessPartyToShowdown } from '../src-next/core/battle/showdown-roundtrip.js';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

const extractorDir = process.argv[2];
if (!extractorDir) {
  console.error('usage: node tests/reconstruction-showdown-real-individual-stats.mjs <built-pinned-pkmn-ps-checkout>');
  process.exit(2);
}
const artifact = inspectExtractedShowdownArtifact(resolve(extractorDir));
const showdown = await loadShowdownBrowserArtifact(artifact);
assert.equal(showdown.revision, REQUIRED_SHOWDOWN_REVISION);

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const starter = {
  id: 'starter-eevee', species: 'Eevee', name: 'Eevee', level: 9, ability: 'Run Away',
  nature_id: 'HARDY', iv: zeroStats, ev: zeroStats,
  hp: 28, maxhp: 28, status: '', heldItem: '', fainted: false,
  moves: [{ id: 'tackle', pp: 35, maxpp: 35 }],
};
const wild = {
  id: 'wild-rattata', species: 'Rattata', name: 'Rattata', level: 3, ability: 'Run Away',
  nature_id: 'HARDY', iv: zeroStats, ev: zeroStats,
  hp: 14, maxhp: 14, status: '', heldItem: '', fainted: false,
  moves: [{ id: 'tackle', pp: 35, maxpp: 35 }],
};
const session = createShowdownStreamSession(showdown, {
  formatid: 'gen9customgame',
  seed: [17, 18, 19, 20],
  p1: { name: 'Mapless', team: projectMaplessPartyToShowdown([starter]) },
  p2: { name: 'Wild', team: projectMaplessPartyToShowdown([wild]) },
});
await session.start();
const rawP1 = session.battleStream.battle.sides[0].pokemon[0];
const rawP2 = session.battleStream.battle.sides[1].pokemon[0];
assert.equal(rawP1.maxhp, 28, 'canonical Lv9 Eevee with zero IV/EV must retain Mapless max HP 28 in real Showdown');
assert.equal(rawP2.maxhp, 14, 'Lv3 Rattata with zero IV/EV must retain projected max HP 14 in real Showdown');
assert.equal(rawP1.set?.nature ?? rawP1.nature, 'Hardy');
assert.deepEqual(rawP1.set?.ivs, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
assert.deepEqual(rawP1.set?.evs, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
console.log(JSON.stringify({ ok: true, showdownRevision: showdown.revision, eeveeMaxHp: rawP1.maxhp, rattataMaxHp: rawP2.maxhp }, null, 2));
