export const MAPLESS_HATCH_VISITS_VERSION_V108 = 918;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function partyOf(runtime) { return Array.isArray(runtime?.player?.party) ? runtime.player.party : []; }
export function isSafariVisitHatchEggV108(pokemon) {
  return Boolean(pokemon && Number(pokemon.mapless_hatch_system_version) === MAPLESS_HATCH_VISITS_VERSION_V108 && Number.isFinite(Number(pokemon.steps_to_hatch)));
}
export function captureSafariFirstVisitCandidateV108(runtime, index) {
  const state = stateOf(runtime);
  const normalizedIndex = Number(index);
  if (!Number.isInteger(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= 8) throw new RangeError("board index must be 0..7");
  return Object.freeze({ index: normalizedIndex, wasVisited: Boolean(state.board_visited?.[normalizedIndex]) });
}
export function advanceSafariEggHatchVisitsV108(runtime, candidate) {
  const state = stateOf(runtime);
  if (!candidate || candidate.wasVisited) return { advanced: false, eggs: [] };
  const index = Number(candidate.index);
  if (!Boolean(state.board_visited?.[index])) return { advanced: false, eggs: [] };
  const eggs = [];
  for (let partyIndex = 0; partyIndex < partyOf(runtime).length; partyIndex += 1) {
    const pokemon = partyOf(runtime)[partyIndex];
    if (!isSafariVisitHatchEggV108(pokemon)) continue;
    const before = Math.max(0, Math.trunc(Number(pokemon.steps_to_hatch)));
    const after = Math.max(0, before - 1);
    pokemon.steps_to_hatch = after;
    eggs.push({ partyIndex, species: pokemon.species ?? null, before, after });
  }
  if (eggs.length) state.last_operations = [...(Array.isArray(state.last_operations) ? state.last_operations : []), { op: "egg_hatch_visit_advance", boardIndex: index, eggs: structuredClone(eggs) }];
  return { advanced: true, eggs };
}
export function hatchReadySafariEggsV108(runtime) {
  const state = stateOf(runtime);
  if (state.battle) return { deferred: true, hatched: [] };
  const hatched = [];
  for (let partyIndex = 0; partyIndex < partyOf(runtime).length; partyIndex += 1) {
    const pokemon = partyOf(runtime)[partyIndex];
    if (!isSafariVisitHatchEggV108(pokemon) || Number(pokemon.steps_to_hatch) > 0) continue;
    pokemon.steps_to_hatch = 0;
    delete pokemon.mapless_hatch_system_version;
    pokemon.mapless_hatched_from_visits = true;
    hatched.push({ partyIndex, species: pokemon.species ?? null, bonusPending: Boolean(pokemon.mapless_egg_shop_bonus_pending) });
  }
  if (hatched.length) {
    state.notice = hatched.length === 1 ? `${hatched[0].species ?? "ポケモン"}がタマゴから孵化した！` : `${hatched.length}個のタマゴが孵化した！`;
    state.last_operations = [...(Array.isArray(state.last_operations) ? state.last_operations : []), { op: "egg_hatched_by_visits", hatched: structuredClone(hatched) }, { op: "request_save", reason: "egg_hatched_by_visits" }];
  }
  return { deferred: false, hatched };
}
export function commitSafariFirstVisitEggLifecycleV108(runtime, candidate) {
  const progress = advanceSafariEggHatchVisitsV108(runtime, candidate);
  const hatch = hatchReadySafariEggsV108(runtime);
  return { progress, hatch };
}
function publishRuntimeChanged() {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent("safari-runtime-changed"));
}
function persistIfPossible(runtime) {
  if (!globalThis.window?.localStorage) return;
  import("./safari-web-startup.js")
    .then(({ saveSafariPlayableRun }) => saveSafariPlayableRun(globalThis.window.localStorage, runtime))
    .catch((error) => { globalThis.__maplessLastError = error; });
}
function waitForVisitCommit(runtime, candidate, attemptsLeft = 600) {
  const state = stateOf(runtime);
  if (Boolean(state.board_visited?.[candidate.index])) {
    const lifecycle = commitSafariFirstVisitEggLifecycleV108(runtime, candidate);
    if (lifecycle.progress.eggs.length || lifecycle.hatch.hatched.length) { persistIfPossible(runtime); publishRuntimeChanged(); }
    return;
  }
  if (attemptsLeft <= 0) return;
  globalThis.window?.setTimeout?.(() => waitForVisitCommit(runtime, candidate, attemptsLeft - 1), 50);
}
let installed = false;
let deferredHatchGuard = false;
export function installSafariEggHatchVisitBridgeV108() {
  if (installed || typeof globalThis.document === "undefined") return false;
  installed = true;
  globalThis.document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button[data-board-index]");
    if (!button) return;
    const runtime = globalThis.__maplessSafariRuntime;
    if (!runtime?.variables?.mapless) return;
    let candidate;
    try { candidate = captureSafariFirstVisitCandidateV108(runtime, Number(button.dataset.boardIndex)); } catch (_) { return; }
    if (!candidate.wasVisited) waitForVisitCommit(runtime, candidate);
  }, true);
  globalThis.window?.addEventListener?.("safari-runtime-changed", () => {
    if (deferredHatchGuard) return;
    const runtime = globalThis.__maplessSafariRuntime;
    if (!runtime?.variables?.mapless || runtime.variables.mapless.battle) return;
    deferredHatchGuard = true;
    try {
      const result = hatchReadySafariEggsV108(runtime);
      if (result.hatched.length) { persistIfPossible(runtime); globalThis.window?.setTimeout?.(() => publishRuntimeChanged(), 0); }
    } finally { deferredHatchGuard = false; }
  });
  return true;
}
