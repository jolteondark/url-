import assert from "node:assert/strict";
import fs from "node:fs";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
const carryover = await import("../runtime/mapless-carryover-next-run.js");
assert.equal(typeof web.prepareSafariNextRun, "function",
  "Safari facade must expose canonical carryover next-run preparation");
assert.equal(typeof web.listSafariCarryoverCandidates, "function",
  "Safari facade must expose owner-classified boxed carryover candidates");
assert.equal(carryover.classifySafariCarryover({ species: "ZAPDOS" }), "special",
  "canonical SUB_LEGENDARY category must map to special carry class");
assert.equal(carryover.classifySafariCarryover({ species: "MEWTWO" }), "legend",
  "canonical LEGENDARY category must map to legend carry class");
assert.equal(carryover.classifySafariCarryover({ species: "DRAGONITE" }), "pseudo_final",
  "canonical pseudo-final species must map after category classification");
assert.equal(carryover.safariCarryoverPartyLimit("special"), 5);
assert.equal(carryover.safariCarryoverPartyLimit("legend"), 5);

const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
const candidate = structuredClone(runtime.player.party[0]);
candidate.personal_id = 270001;
candidate.nature_id = "ADAMANT";
candidate.level = 42;
candidate.hp = 1;
candidate.max_hp = Math.max(99, Number(candidate.max_hp ?? 1));
candidate.status = "POISON";
candidate.status_count = 3;
candidate.item = "POTION";
candidate.ev = {
  HP: 252,
  ATTACK: 252,
  DEFENSE: 4,
  SPECIAL_ATTACK: 0,
  SPECIAL_DEFENSE: 0,
  SPEED: 0,
};
candidate.mapless_bonus_stats = {
  HP: 7,
  ATTACK: 6,
  DEFENSE: 5,
  SPECIAL_ATTACK: 4,
  SPECIAL_DEFENSE: 3,
  SPEED: 2,
};
const originalMoveIds = candidate.moves
  .map((move) => typeof move === "string" ? move : move?.id)
  .filter(Boolean)
  .slice(0, 4);

runtime.player.party = [];
runtime.storage_system.boxes[0].slots[0] = structuredClone(candidate);
state.mapless_run_active = false;
state.mapless_run_prepared = false;
state.mapless_run_end_pending = false;
state.mapless_carryover_pending = true;
state.mapless_carryover_overflow = false;
state.location = "home";
state.board_events = [];
state.board_revealed = [];
state.board_consumed = [];
state.board_visited = [];
runtime.bag.slots = [["POTION", 99]];
runtime.bag.money = 99999;

const candidates = await web.listSafariCarryoverCandidates(runtime);
assert.equal(candidates.length, 1, "eligible boxed keeper must be exposed exactly once");
assert.deepEqual(
  { boxIndex: candidates[0].boxIndex, slotIndex: candidates[0].slotIndex, carryClass: candidates[0].carryClass },
  { boxIndex: 0, slotIndex: 0, carryClass: "general" },
  "candidate projection must preserve stable box/slot selection and canonical class",
);

const prepared = await web.prepareSafariNextRun(runtime, { boxIndex: 0, slotIndex: 0 });
assert.equal(prepared.result, "prepared", "eligible boxed carryover must prepare the next run");
assert.equal(globalThis.__maplessSafariRuntime, runtime,
  "successful next-run preparation must keep the prepared caller as the live Safari runtime");
assert.equal(runtime.storage_system.boxes[0].slots[0] ?? null, null,
  "selected boxed original must be removed only after carry normalization succeeds");
assert.equal(runtime.player.party.length, 1, "next run must begin with exactly one keeper");
const keeper = runtime.player.party[0];
assert.equal(keeper.personal_id, candidate.personal_id, "carry clone must preserve individual identity");
assert.equal(keeper.nature_id, "ADAMANT", "carry normalization must preserve the selected nature");
assert.equal(Number(keeper.level), 5, "carried Pokemon level must reset to 5");
assert.deepEqual(Object.values(keeper.ev ?? {}).map(Number), [0, 0, 0, 0, 0, 0],
  "carried Pokemon EVs must reset to zero");
assert.equal(keeper.item ?? null, null, "held item must be removed");
assert.equal(keeper.status ?? "NONE", "NONE", "status must be cleared");
assert.equal(Number(keeper.status_count ?? 0), 0, "status count must be cleared");
assert.deepEqual(
  keeper.moves.map((move) => typeof move === "string" ? move : move?.id).filter(Boolean).slice(0, 4),
  originalMoveIds,
  "carry normalization must preserve the current first four move IDs",
);
assert.ok(Number(keeper.hp) > 0 && Number(keeper.hp) === Number(keeper.max_hp),
  "carried Pokemon must be fully healed after stat recalculation");
assert.deepEqual(Object.values(keeper.mapless_bonus_stats ?? {}).map(Number), [0, 0, 0, 0, 0, 0],
  "Mapless bonus stats must reset");

assert.equal(state.mapless_carry_class, "general", "ordinary eligible carry must use general class");
assert.equal(state.mapless_run_active, true);
assert.equal(state.mapless_run_prepared, true);
assert.equal(state.mapless_carryover_pending, false);
assert.equal(state.mapless_carryover_overflow, false);
assert.equal(state.mapless_run_end_pending, false);
assert.equal(state.location, "day_board", "prepared next run must enter Day Board");
assert.equal(state.board_events.length, 8, "next run must generate an 8-cell Day Board");
assert.equal(state.board_revealed.length, 8);
assert.equal(state.board_consumed.length, 8);
assert.equal(state.board_visited.length, 8);

const quantities = new Map(runtime.bag.slots.filter(Boolean).map(([id, quantity]) => [id, Number(quantity)]));
assert.equal(quantities.get("POKEBALL"), 5, "general carry supplies must include 5 Poke Balls");
assert.equal(quantities.get("POTION"), 3, "general carry supplies must include 3 Potions");
assert.equal(Number(runtime.bag.money), 1000,
  "general carry start money must use the existing public Safari base starting-money owner");
assert.ok(prepared.operations?.some((operation) => operation.op === "request_save"),
  "prepared next run must request persistence");

const uiSource = fs.readFileSync(new URL("../carryover-next-run-presentation.js", import.meta.url), "utf8");
const previewSource = fs.readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.match(uiSource, /from "\.\/runtime\/safari-web-playable-integration\.js"/, "carryover UI must reuse the unversioned shared facade instance");
assert.match(uiSource, /mapless_carryover_pending/, "carryover UI must render only for pending carryover state");
assert.match(uiSource, /state\.location !== "home"/, "carryover UI must be scoped to home");
assert.match(uiSource, /boxIndex: Number\(button\.dataset\.carryoverBox\)/, "UI must pass stable box coordinate to the owner");
assert.match(uiSource, /slotIndex: Number\(button\.dataset\.carryoverSlot\)/, "UI must pass stable slot coordinate to the owner");
assert.match(uiSource, /operation\.op === "request_save"/, "UI persistence must be driven by the shared owner request_save operation");
assert.match(uiSource, /addEventListener\("safari-preview-start", renderAfterPreviewRestore\)/,
  "carryover UI must rerender after preview-start restores a saved pending runtime");
assert.match(uiSource, /requestAnimationFrame\(\(\) => void renderCarryover\(\)\)/,
  "preview-start carryover rerender must wait until the restored runtime reaches the next frame");
assert.match(previewSource, /carryover-next-run-presentation\.js\?v=20260818-1547/, "playable preview must required-load the fixed carryover selector build");
assert.match(indexSource, /preview\.js\?v=20260818-1547/, "public entrypoint must expose the fixed carryover preview build");

console.log("Safari carryover home -> boxed keeper -> canonical reset -> restored-home UI -> Day Board: ok");
