#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const tests = [
  'tests/new-core-fresh-start-smoke.mjs',
  'tests/new-core-fresh-start-parity.mjs',
  'tests/new-core-canonical-day-board-parity.mjs',
  'tests/new-core-wild-type-rotation-parity.mjs',
  'tests/new-core-general-wild-encounter-parity.mjs',
  'tests/new-core-mapless-experience-parity.mjs',
  'tests/new-core-save-continue-smoke.mjs',
  'tests/new-core-p1-domain-vertical-smoke.mjs',
  'tests/new-core-p1-presentation-handoff.mjs',
  'tests/new-core-p1-battle-reward-capacity-smoke.mjs',
  'tests/new-core-browser-storage-reload-smoke.mjs',
  'tests/new-core-battle-rng-and-wild-ai.mjs',
  'tests/new-core-showdown-semantic-events.mjs',
  'tests/new-core-p1-playable-controller.mjs',
  'tests/new-core-p1-deterministic-replay.mjs',
  'tests/new-core-p1-pixel-view.mjs',
  'tests/new-core-p1-event-messages.mjs',
  'tests/new-core-p1-presentation-pump.mjs',
  'tests/new-core-browser-showdown-publication-loader.mjs',
  'tests/new-core-p1-browser-app.mjs',
  'tests/new-core-browser-performance-probe.mjs',
];

for (const test of tests) {
  console.log(`\n[p1-pure] ${test}`);
  const result = spawnSync(process.execPath, [test], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`[p1-pure] FAIL ${test} (${result.status ?? 'signal'})`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n[p1-pure] PASS New Core P1 deterministic domain + presentation + browser seams');
