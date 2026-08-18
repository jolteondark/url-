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
assert.equal(carryover.classifySafariCarryover({ species: "ZAPDOS" }), "special");
assert.equal(carryover.classifySafariCarryover({ species: "MEWTWO" }), "legend");
assert.equal(carryover.classifySafariCarryover({ species: "DRAGONITE" }), "pseudo_final");
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
candidate.ev = { HP: 252, ATTACK: 252, DEFENSE: 4, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
candidate.mapless_bonus_stats = { HP: 7, ATTACK: 6, DEFENSE: 5, SPECIAL_ATTACK: 4, SPECIAL_DEFENSE: 3, SPEED: 2 };
const originalMoveIds = candidate.moves.map((move) => typeof move === "string" ? move : move?.id).filter(Boolean).slice(0, 4);

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
assert.equal(candidates.length, 1);
assert.deepEqual(
  { boxIndex: candidates[0].boxIndex, slotIndex: candidates[0].slotIndex, carryClass: candidates[0].carryClass },
  { boxIndex: 0, slotIndex: 0, carryClass: "general" },
);
const prepared = await web.prepareSafariNextRun(runtime, { boxIndex: 0, slotIndex: 0 });
assert.equal(prepared.result, "prepared");
assert.equal(globalThis.__maplessSafariRuntime, runtime);
assert.equal(runtime.storage_system.boxes[0].slots[0] ?? null, null);
assert.equal(runtime.player.party.length, 1);
const keeper = runtime.player.party[0];
assert.equal(keeper.personal_id, candidate.personal_id);
assert.equal(keeper.nature_id, "ADAMANT");
assert.equal(Number(keeper.level), 5);
assert.deepEqual(Object.values(keeper.ev ?? {}).map(Number), [0, 0, 0, 0, 0, 0]);
assert.equal(keeper.item ?? null, null);
assert.equal(keeper.status ?? "NONE", "NONE");
assert.equal(Number(keeper.status_count ?? 0), 0);
assert.deepEqual(
  keeper.moves.map((move) => typeof move === "string" ? move : move?.id).filter(Boolean).slice(0, 4),
  originalMoveIds,
);
assert.ok(Number(keeper.hp) > 0 && Number(keeper.hp) === Number(keeper.max_hp));
assert.deepEqual(Object.values(keeper.mapless_bonus_stats ?? {}).map(Number), [0, 0, 0, 0, 0, 0]);
assert.equal(state.mapless_carry_class, "general");
assert.equal(state.mapless_run_active, true);
assert.equal(state.mapless_run_prepared, true);
assert.equal(state.mapless_carryover_pending, false);
assert.equal(state.mapless_carryover_overflow, false);
assert.equal(state.mapless_run_end_pending, false);
assert.equal(state.location, "day_board");
assert.equal(state.board_events.length, 8);
assert.equal(state.board_revealed.length, 8);
assert.equal(state.board_consumed.length, 8);
assert.equal(state.board_visited.length, 8);
const quantities = new Map(runtime.bag.slots.filter(Boolean).map(([id, quantity]) => [id, Number(quantity)]));
assert.equal(quantities.get("POKEBALL"), 5);
assert.equal(quantities.get("POTION"), 3);
assert.equal(Number(runtime.bag.money), 1000);
assert.ok(prepared.operations?.some((operation) => operation.op === "request_save"));

const uiSource = fs.readFileSync(new URL("../carryover-next-run-presentation.js", import.meta.url), "utf8");
const previewSource = fs.readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.match(uiSource, /from "\.\/runtime\/safari-web-playable-integration\.js"/);
assert.match(uiSource, /mapless_carryover_pending/);
assert.match(uiSource, /state\.location !== "home"/);
assert.match(uiSource, /boxIndex: Number\(button\.dataset\.carryoverBox\)/);
assert.match(uiSource, /slotIndex: Number\(button\.dataset\.carryoverSlot\)/);
assert.match(uiSource, /operation\.op === "request_save"/);
assert.match(uiSource, /export async function renderSafariCarryoverSelection\(\)/,
  "selector must expose a deterministic render entrypoint");
assert.match(uiSource, /carryover presentation board-card is unavailable/,
  "missing host must retain exact diagnostics");
assert.match(uiSource, /持ち越し候補を読み込めませんでした。通常スターターなら次のランを開始できます。/,
  "candidate load failure must never trap Run End without fallback");
assert.match(uiSource, /window\.dispatchEvent\(new CustomEvent\("safari-runtime-changed"\)\)/,
  "successful selection must repaint the main preview");
assert.match(previewSource, /preview-app\.js\?v=20260818-2318/,
  "carryover acceptance must follow the current preview-app cache key instead of pinning the older rescue build");
assert.match(previewSource, /carryover-next-run-presentation\.js\?v=20260818-1558/);
assert.match(previewSource, /await carryoverPresentation\.renderSafariCarryoverSelection\?\.\(\)/,
  "preview must explicitly render selector after saved runtime restore");
assert.match(previewSource, /function rememberPreviewStartError\(error\)/,
  "preview owner must diagnose selector-module startup failures");
assert.match(previewSource, /state\?\.mapless_carryover_pending && state\.location === "home"/,
  "pending-home selector failure must retain carryover state");
assert.match(previewSource, /exact\.state = typeof structuredClone === "function" \? structuredClone\(state\) : \{ \.\.\.state \}/,
  "selector-module failure must attach an exact pending-home state snapshot");
assert.match(previewSource, /globalThis\.__maplessLastError = exact/,
  "selector-module failure must retain the diagnosed exact Error globally");
assert.match(previewSource, /carryoverPanelVisible/);
assert.match(previewSource, /carryoverError/);
assert.match(indexSource, /preview\.js\?v=20260819-0820/);

console.log("Safari carryover Run End -> visible keeper/fallback -> next Day Board: ok");