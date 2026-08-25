import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-trainer-camp-interaction.js"), "utf8");
const touch = fs.readFileSync(path.join(root, "trainer-camp-touch-presentation.js"), "utf8");
const chain = fs.readFileSync(path.join(root, "lost-bag-touch-presentation.js"), "utf8");

assert.match(adapter, /resolveTrainerCamp/,
  "Trainer Camp Safari adapter must delegate event semantics to the canonical owner");
assert.match(adapter, /presentationOperation\(campProbe\(event, scale, type\)\)/,
  "task/type suitability must be probed through the canonical owner rather than duplicated in Safari");
assert.doesNotMatch(adapter, /const\s+TASKS\s*=/,
  "Safari adapter must not duplicate the canonical Trainer Camp task/type table");
assert.match(adapter, /borrowSafariSharedRunRandomInt/,
  "random camp rewards must borrow the shared persisted run RNG");
assert.match(adapter, /resolveMaplessNormalEventMediumReward/,
  "typed help must use the shared medium normal-event reward owner");
assert.match(adapter, /resolveMaplessNormalEventSmallReward/,
  "manual success must use the shared small normal-event reward owner");
assert.match(adapter, /healSafariPartyPercent\(runtime, 50, \{ cureStatus:true \}\)/,
  "typed help must reuse the shared party healing owner for canonical 50% heal + status cure");
assert.match(adapter, /healSafariPartyPercent\(runtime, 25, \{ cureStatus:false \}\)/,
  "manual help must reuse the shared party healing owner for canonical 25% heal");
assert.match(adapter, /grantSafariNormalEventPokemonExp\(runtime, partyIndex, Number\(expOperation\.amount\)\)/,
  "typed help EXP must reuse the shared normal-event EXP owner");
assert.match(adapter, /state\.preview_encounter_counter = counter/,
  "failed reward preflight must restore the shared RNG counter so retries do not consume hidden draws");
assert.match(adapter, /runtime\.bag\.money = Math\.max\(0,[\s\S]*- price\)/,
  "paid meal must debit the existing runtime Bag money owner surface");
assert.match(adapter, /request_save.*trainer_camp_resolved/,
  "completed Trainer Camp routes must request persistence");

assert.match(touch, /normal_event_id === "trainer_camp"/,
  "Trainer Camp must be discoverable from the Safari Day Board");
assert.match(touch, /safariTrainerCampPresentation/,
  "touch UI must derive choices from the Safari adapter");
assert.match(touch, /resolveSafariTrainerCampInteraction/,
  "touch actions must dispatch to the Trainer Camp adapter");
assert.match(touch, /saveSafariPlayableRun/,
  "touch completion must use existing Safari persistence");
assert.match(chain, /trainer-camp-touch-presentation\.js\?v=/,
  "the live touch module chain must load the fresh Trainer Camp presentation owner");

console.log("Safari Trainer Camp canonical-owner hookup smoke passed");
